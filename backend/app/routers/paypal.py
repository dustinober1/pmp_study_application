"""
PayPal API routes for checkout and webhook handling.

Provides endpoints for:
- Creating checkout orders and subscriptions
- Capturing payments
- Handling PayPal webhooks for subscription events
"""

import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.auth import decode_access_token
from app.database import get_db
from app.models.subscription import Subscription, SubscriptionPeriod, SubscriptionStatus
from app.models.user import Tier, User
from app.services.paypal_service import PayPalError, PayPalService, get_paypal_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/paypal", tags=["PayPal"])


# Schemas
class CreateCheckoutRequest(BaseModel):
    """Request schema for creating checkout session."""

    period: SubscriptionPeriod = Field(
        ..., description="Billing period: monthly or yearly"
    )
    return_url: str = Field(
        ..., description="URL to redirect after successful payment"
    )
    cancel_url: str = Field(
        ..., description="URL to redirect after cancelled payment"
    )

    @field_validator("return_url", "cancel_url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Ensure URL is not empty."""
        if not v or not v.startswith(("http://", "https://")):
            raise ValueError("Must be a valid URL")
        return v


class CheckoutResponse(BaseModel):
    """Response schema for checkout session creation."""

    checkout_url: str
    order_id: str | None = None
    subscription_id: str | None = None


class SubscriptionResponse(BaseModel):
    """Response schema for subscription details."""

    id: str
    status: str
    period: str
    amount: float
    started_at: datetime
    expires_at: datetime
    is_active: bool


def get_current_user_optional(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> User | None:
    """
    Get current user from optional authorization header.

    Used for webhooks and public endpoints where user context is optional.
    """
    if not authorization:
        return None

    try:
        token = authorization.replace("Bearer ", "")
        payload = decode_access_token(token)
        if payload:
            user_id = payload.get("sub")
            if user_id:
                user = db.query(User).filter(User.id == user_id).first()
                return user
    except Exception:
        pass

    return None


def get_current_user(
    authorization: str = Header(...),
    db: Session = Depends(get_db),
) -> User:
    """
    Get current authenticated user.

    Used for endpoints requiring authentication.
    """
    token = authorization.replace("Bearer ", "")
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


@router.post(
    "/checkout",
    response_model=CheckoutResponse,
    status_code=status.HTTP_200_OK,
    summary="Create PayPal checkout session",
    description="Creates a PayPal subscription checkout. Returns approval URL for redirect.",
)
async def create_checkout(
    request: CreateCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    paypal_service: PayPalService = Depends(get_paypal_service),
) -> CheckoutResponse:
    """
    Create a PayPal checkout session for premium subscription.

    Creates a subscription and returns the approval URL where the user
    should be redirected to complete the payment.
    """
    try:
        # Create PayPal subscription
        result = await paypal_service.create_subscription(
            period=request.period,
            return_url=request.return_url,
            cancel_url=request.cancel_url,
        )

        # Create pending subscription record
        started_at = datetime.utcnow()
        expires_at = started_at + (
            timedelta(days=30)
            if request.period == SubscriptionPeriod.MONTHLY
            else timedelta(days=365)
        )

        pricing = paypal_service.PRICING[request.period]

        subscription = Subscription(
            user_id=current_user.id,
            paypal_subscription_id=result["subscription_id"],
            status=SubscriptionStatus.PENDING,
            period=request.period,
            amount=pricing["amount"],
            started_at=started_at,
            expires_at=expires_at,
        )
        db.add(subscription)
        db.commit()
        db.refresh(subscription)

        return CheckoutResponse(
            checkout_url=result["approval_url"],
            subscription_id=result["subscription_id"],
        )

    except PayPalError as e:
        logger.error(f"PayPal checkout creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create checkout: {str(e)}",
        )


@router.post(
    "/webhook",
    status_code=status.HTTP_200_OK,
    summary="Handle PayPal webhook events",
    description="Processes PayPal webhook notifications for subscription events.",
)
async def handle_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    paypal_service: PayPalService = Depends(get_paypal_service),
) -> dict[str, str]:
    """
    Handle PayPal webhook events.

    Processes subscription created, activated, cancelled, and payment events.
    Updates subscription status and user tier accordingly.
    """
    try:
        # Get raw body
        body = await request.body()

        # Get PayPal signature headers
        headers = {
            "PAYPAL-AUTH-ALGO": request.headers.get("PAYPAL-AUTH-ALGO", ""),
            "PAYPAL-CERT-ID": request.headers.get("PAYPAL-CERT-ID", ""),
            "PAYPAL-TRANSMISSION-ID": request.headers.get("PAYPAL-TRANSMISSION-ID", ""),
            "PAYPAL-CERT-URL": request.headers.get("PAYPAL-CERT-URL", ""),
            "PAYPAL-TRANSMISSION-SIG": request.headers.get("PAYPAL-TRANSMISSION-SIG", ""),
            "PAYPAL-TRANSMISSION-TIME": request.headers.get("PAYPAL-TRANSMISSION-TIME", ""),
        }

        # Verify webhook signature
        verification = await paypal_service.verify_webhook_signature(headers, body)
        if not verification.get("verified"):
            logger.warning("Webhook signature verification failed")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature",
            )

        # Parse webhook event
        import json

        event_data = json.loads(body)
        event_type = event_data.get("event_type")

        # Process event in background
        background_tasks.add_task(
            process_webhook_event,
            event_type=event_type,
            event_data=event_data,
            db=db,
        )

        return {"status": "accepted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Webhook processing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed",
        )


@router.post(
    "/webhook/ipn",
    status_code=status.HTTP_200_OK,
    summary="Handle PayPal IPN (Instant Payment Notification)",
    description="Processes PayPal IPN messages for legacy webhook support.",
)
async def handle_ipn(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    paypal_service: PayPalService = Depends(get_paypal_service),
) -> dict[str, str]:
    """
    Handle PayPal IPN (Instant Payment Notification) messages.

    Provides backward compatibility for IPN-based notifications.
    """
    try:
        form_data = dict(await request.form())

        # Verify IPN
        verified = await paypal_service.verify_ipn(form_data)
        if not verified:
            logger.warning("IPN verification failed")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid IPN",
            )

        # Parse IPN message
        ipn_data = paypal_service.parse_ipn_message(form_data)

        # Process IPN in background
        background_tasks.add_task(
            process_ipn_message,
            ipn_data=ipn_data,
            db=db,
        )

        return {"status": "accepted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"IPN processing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="IPN processing failed",
        )


@router.get(
    "/subscription",
    response_model=SubscriptionResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user subscription",
    description="Returns the active subscription for the authenticated user.",
)
async def get_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SubscriptionResponse:
    """
    Get the current user's active subscription.

    Returns the most recent active or pending subscription.
    """
    subscription = (
        db.query(Subscription)
        .filter(Subscription.user_id == current_user.id)
        .filter(
            (Subscription.status == SubscriptionStatus.ACTIVE)
            | (Subscription.status == SubscriptionStatus.PENDING)
        )
        .order_by(Subscription.created_at.desc())
        .first()
    )

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found",
        )

    return SubscriptionResponse(
        id=str(subscription.id),
        status=subscription.status.value,
        period=subscription.period.value,
        amount=float(subscription.amount),
        started_at=subscription.started_at,
        expires_at=subscription.expires_at,
        is_active=subscription.status == SubscriptionStatus.ACTIVE,
    )


@router.post(
    "/subscription/cancel",
    status_code=status.HTTP_200_OK,
    summary="Cancel current subscription",
    description="Cancels the active subscription for the authenticated user.",
)
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    paypal_service: PayPalService = Depends(get_paypal_service),
) -> dict[str, str]:
    """
    Cancel the current user's active subscription.

    Cancels both the PayPal subscription and updates the local record.
    Access remains until the expiration date.
    """
    subscription = (
        db.query(Subscription)
        .filter(Subscription.user_id == current_user.id)
        .filter(Subscription.status == SubscriptionStatus.ACTIVE)
        .order_by(Subscription.created_at.desc())
        .first()
    )

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription to cancel",
        )

    try:
        # Cancel in PayPal
        if subscription.paypal_subscription_id:
            await paypal_service.cancel_subscription(subscription.paypal_subscription_id)

        # Update local record
        subscription.status = SubscriptionStatus.CANCELLED
        subscription.cancelled_at = datetime.utcnow()
        db.commit()

        return {"status": "cancelled", "message": "Subscription cancelled successfully"}

    except PayPalError as e:
        logger.error(f"PayPal subscription cancellation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel subscription: {str(e)}",
        )


# Background task functions
async def process_webhook_event(event_type: str, event_data: dict, db: Session) -> None:
    """
    Process PayPal webhook event in background.

    Handles subscription lifecycle events:
    - BILLING.SUBSCRIPTION.CREATED
    - BILLING.SUBSCRIPTION.ACTIVATED
    - BILLING.SUBSCRIPTION.CANCELLED
    - BILLING.SUBSCRIPTION.EXPIRED
    - PAYMENT.SALE.COMPLETED
    """
    logger.info(f"Processing webhook event: {event_type}")

    resource = event_data.get("resource", {})
    subscription_id = resource.get("id")

    if not subscription_id:
        logger.warning("Webhook event missing subscription ID")
        return

    # Find subscription by PayPal subscription ID
    subscription = (
        db.query(Subscription)
        .filter(Subscription.paypal_subscription_id == subscription_id)
        .first()
    )

    if not subscription:
        logger.warning(f"Subscription not found for PayPal ID: {subscription_id}")
        return

    # Handle different event types
    if event_type == "BILLING.SUBSCRIPTION.ACTIVATED":
        subscription.status = SubscriptionStatus.ACTIVE
        # Update user tier
        user = db.query(User).filter(User.id == subscription.user_id).first()
        if user:
            user.tier = Tier.PREMIUM

    elif event_type == "BILLING.SUBSCRIPTION.CANCELLED":
        subscription.status = SubscriptionStatus.CANCELLED
        subscription.cancelled_at = datetime.utcnow()

    elif event_type == "BILLING.SUBSCRIPTION.EXPIRED":
        subscription.status = SubscriptionStatus.EXPIRED
        # Downgrade user tier
        user = db.query(User).filter(User.id == subscription.user_id).first()
        if user:
            user.tier = Tier.FREE

    db.commit()
    logger.info(f"Processed webhook event {event_type} for subscription {subscription_id}")


async def process_ipn_message(ipn_data: dict, db: Session) -> None:
    """
    Process PayPal IPN message in background.

    Handles IPN notifications for subscription payments and status changes.
    """
    logger.info(f"Processing IPN message: {ipn_data.get('txn_type')}")

    txn_type = ipn_data.get("txn_type")
    subscr_id = ipn_data.get("subscr_id")
    payment_status = ipn_data.get("payment_status")

    if not subscr_id:
        logger.warning("IPN message missing subscription ID")
        return

    # Find subscription by PayPal subscription ID
    subscription = (
        db.query(Subscription)
        .filter(Subscription.paypal_subscription_id == subscr_id)
        .first()
    )

    if not subscription:
        logger.warning(f"Subscription not found for PayPal ID: {subscr_id}")
        return

    # Handle IPN transaction types
    if txn_type == "subscr_signup":
        # New subscription created
        subscription.status = SubscriptionStatus.ACTIVE
        user = db.query(User).filter(User.id == subscription.user_id).first()
        if user:
            user.tier = Tier.PREMIUM

    elif txn_type == "subscr_cancel":
        # Subscription cancelled
        subscription.status = SubscriptionStatus.CANCELLED
        subscription.cancelled_at = datetime.utcnow()

    elif txn_type == "subscr_eot":
        # Subscription end of term
        subscription.status = SubscriptionStatus.EXPIRED
        user = db.query(User).filter(User.id == subscription.user_id).first()
        if user:
            user.tier = Tier.FREE

    elif txn_type == "subscr_payment" and payment_status == "completed":
        # Successful payment - extend expiration
        if subscription.period == SubscriptionPeriod.MONTHLY:
            subscription.expires_at = subscription.expires_at + timedelta(days=30)
        else:
            subscription.expires_at = subscription.expires_at + timedelta(days=365)

    db.commit()
    logger.info(f"Processed IPN {txn_type} for subscription {subscr_id}")
