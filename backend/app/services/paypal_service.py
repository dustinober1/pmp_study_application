"""
PayPal service for order creation, capture, and subscription management.

Integrates with PayPal REST API for payment processing and subscription management.
"""

import logging
from datetime import datetime, timedelta
from typing import Any
from urllib.parse import urljoin

import httpx

from app.config import get_settings
from app.models.subscription import SubscriptionPeriod

settings = get_settings()
logger = logging.getLogger(__name__)


class PayPalError(Exception):
    """Base exception for PayPal-related errors."""

    pass


class PayPalConfigError(PayPalError):
    """Raised when PayPal configuration is missing or invalid."""

    pass


class PayPalAPIError(PayPalError):
    """Raised when PayPal API request fails."""

    pass


class PayPalWebhookError(PayPalError):
    """Raised when PayPal webhook validation fails."""

    pass


class PayPalService:
    """
    Service for PayPal payment processing and subscription management.

    Supports:
    - Order creation and capture for one-time payments
    - Subscription creation and management
    - Webhook verification and handling
    """

    # PayPal API endpoints
    PAYPAL_BASE_URL_SANDBOX = "https://api-m.sandbox.paypal.com"
    PAYPAL_BASE_URL_LIVE = "https://api-m.paypal.com"

    # Pricing configuration
    PRICING = {
        SubscriptionPeriod.MONTHLY: {"amount": 14.99, "name": "Premium Monthly"},
        SubscriptionPeriod.YEARLY: {"amount": 119.99, "name": "Premium Yearly"},
    }

    def __init__(
        self,
        client_id: str | None = None,
        client_secret: str | None = None,
        webhook_url: str | None = None,
        mode: str = "sandbox",
    ):
        """
        Initialize PayPal service with credentials.

        Args:
            client_id: PayPal client ID (defaults to settings)
            client_secret: PayPal client secret (defaults to settings)
            webhook_url: Webhook URL for IPN notifications
            mode: 'sandbox' or 'live'
        """
        self.client_id = client_id or getattr(settings, "paypal_client_id", None)
        self.client_secret = client_secret or getattr(settings, "paypal_client_secret", None)
        self.webhook_url = webhook_url or getattr(settings, "paypal_webhook_url", None)
        self.mode = mode or getattr(settings, "paypal_mode", "sandbox")

        if not self.client_id or not self.client_secret:
            raise PayPalConfigError("PayPal credentials not configured")

        self.base_url = (
            self.PAYPAL_BASE_URL_LIVE if self.mode == "live" else self.PAYPAL_BASE_URL_SANDBOX
        )
        self._access_token: str | None = None
        self._token_expires_at: datetime | None = None

    async def _get_access_token(self) -> str:
        """
        Get or refresh PayPal API access token.

        Returns:
            Access token string

        Raises:
            PayPalAPIError: If token request fails
        """
        # Return cached token if still valid
        if self._access_token and self._token_expires_at:
            if datetime.utcnow() < self._token_expires_at:
                return self._access_token

        # Request new token
        async with httpx.AsyncClient() as client:
            response = await client.post(
                urljoin(self.base_url, "/v1/oauth2/token"),
                auth=(self.client_id, self.client_secret),
                data={"grant_type": "client_credentials"},
                headers={"Accept": "application/json"},
            )

            if response.status_code != 200:
                raise PayPalAPIError(f"Failed to get access token: {response.text}")

            data = response.json()
            self._access_token = data["access_token"]
            # Set expiration to 5 minutes before actual expiry
            expires_in = data.get("expires_in", 3600)
            self._token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in - 300)

            return self._access_token

    def _get_headers(self) -> dict[str, str]:
        """Get headers with authorization for PayPal API requests."""
        # Note: This is a sync method, but we'll handle token refresh async
        return {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def create_order(
        self,
        amount: float,
        currency: str = "USD",
        description: str = "PMP 2026 Study Premium Subscription",
        return_url: str = "",
        cancel_url: str = "",
    ) -> dict[str, Any]:
        """
        Create a PayPal order for one-time payment.

        Args:
            amount: Payment amount
            currency: Currency code (default: USD)
            description: Order description
            return_url: URL to redirect after successful payment
            cancel_url: URL to redirect after cancelled payment

        Returns:
            Dictionary with order ID and approval URL

        Raises:
            PayPalAPIError: If order creation fails
        """
        access_token = await self._get_access_token()

        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "amount": {
                        "currency_code": currency,
                        "value": f"{amount:.2f}",
                    },
                    "description": description,
                }
            ],
            "application_context": {
                "return_url": return_url,
                "cancel_url": cancel_url,
                "brand_name": "PMP 2026 Study",
                "user_action": "PAY_NOW",
            },
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                urljoin(self.base_url, "/v2/checkout/orders"),
                headers={**self._get_headers(), "Authorization": f"Bearer {access_token}"},
                json=payload,
            )

            if response.status_code not in (200, 201):
                raise PayPalAPIError(f"Failed to create order: {response.text}")

            data = response.json()

            # Extract approval URL from links
            approval_url = ""
            for link in data.get("links", []):
                if link.get("rel") == "approve":
                    approval_url = link["href"]
                    break

            return {
                "order_id": data["id"],
                "approval_url": approval_url,
                "status": data["status"],
            }

    async def capture_order(self, order_id: str) -> dict[str, Any]:
        """
        Capture payment for an approved order.

        Args:
            order_id: PayPal order ID

        Returns:
            Capture response with transaction details

        Raises:
            PayPalAPIError: If capture fails
        """
        access_token = await self._get_access_token()

        async with httpx.AsyncClient() as client:
            response = await client.post(
                urljoin(self.base_url, f"/v2/checkout/orders/{order_id}/capture"),
                headers={**self._get_headers(), "Authorization": f"Bearer {access_token}"},
            )

            if response.status_code not in (200, 201):
                raise PayPalAPIError(f"Failed to capture order: {response.text}")

            data = response.json()
            return {
                "capture_id": data["purchase_units"][0]["payments"]["captures"][0]["id"],
                "status": data["status"],
                "amount": float(
                    data["purchase_units"][0]["payments"]["captures"][0]["amount"]["value"]
                ),
            }

    async def create_subscription(
        self,
        period: SubscriptionPeriod,
        return_url: str = "",
        cancel_url: str = "",
    ) -> dict[str, Any]:
        """
        Create a PayPal subscription.

        Args:
            period: Billing period (monthly or yearly)
            return_url: URL to redirect after successful subscription
            cancel_url: URL to redirect after cancelled subscription

        Returns:
            Dictionary with subscription ID and approval URL

        Raises:
            PayPalAPIError: If subscription creation fails
        """
        access_token = await self._get_access_token()

        pricing = self.PRICING[period]
        plan_id = await self._get_or_create_plan(period)

        payload = {
            "plan_id": plan_id,
            "application_context": {
                "return_url": return_url,
                "cancel_url": cancel_url,
                "brand_name": "PMP 2026 Study",
                "user_action": "SUBSCRIBE_NOW",
                "payment_method": {
                    "payer_selected": "PAYPAL",
                    "payee_preferred": "IMMEDIATE_PAYMENT_REQUIRED",
                },
            },
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                urljoin(self.base_url, "/v1/billing/subscriptions"),
                headers={**self._get_headers(), "Authorization": f"Bearer {access_token}"},
                json=payload,
            )

            if response.status_code not in (200, 201):
                raise PayPalAPIError(f"Failed to create subscription: {response.text}")

            data = response.json()

            # Extract approval URL
            approval_url = ""
            for link in data.get("links", []):
                if link.get("rel") == "approve":
                    approval_url = link["href"]
                    break

            return {
                "subscription_id": data["id"],
                "approval_url": approval_url,
                "status": data["status"],
            }

    async def _get_or_create_plan(self, period: SubscriptionPeriod) -> str:
        """
        Get existing plan ID or create a new one.

        Args:
            period: Billing period

        Returns:
            PayPal plan ID

        Raises:
            PayPalAPIError: If plan operations fail
        """
        # Try to get existing plan from settings
        plan_id_key = f"paypal_plan_{period.value}"
        existing_plan_id = getattr(settings, plan_id_key, None)
        if existing_plan_id:
            return existing_plan_id

        # Create new plan
        access_token = await self._get_access_token()
        pricing = self.PRICING[period]

        interval = "MONTH" if period == SubscriptionPeriod.MONTHLY else "YEAR"
        interval_count = 1

        payload = {
            "product_id": await self._get_or_create_product(),
            "name": pricing["name"],
            "description": f"PMP 2026 Study Premium - {period.value.capitalize()} Subscription",
            "status": "ACTIVE",
            "billing_cycles": [
                {
                    "frequency": {
                        "interval_unit": interval,
                        "interval_count": interval_count,
                    },
                    "tenure_type": "REGULAR",
                    "sequence": 1,
                    "total_cycles": 0,  # Infinite
                    "pricing_scheme": {
                        "fixed_price": {
                            "value": f"{pricing['amount']:.2f}",
                            "currency_code": "USD",
                        }
                    },
                }
            ],
            "payment_preferences": {
                "auto_bill_outstanding": True,
                "setup_fee": {
                    "value": "0",
                    "currency_code": "USD",
                },
                "setup_fee_failure_action": "CONTINUE",
                "payment_failure_threshold": 3,
            },
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                urljoin(self.base_url, "/v1/billing/plans"),
                headers={**self._get_headers(), "Authorization": f"Bearer {access_token}"},
                json=payload,
            )

            if response.status_code not in (200, 201):
                raise PayPalAPIError(f"Failed to create plan: {response.text}")

            data = response.json()
            return data["id"]

    async def _get_or_create_product(self) -> str:
        """
        Get existing product ID or create a new one.

        Returns:
            PayPal product ID

        Raises:
            PayPalAPIError: If product operations fail
        """
        # Try to get existing product from settings
        existing_product_id = getattr(settings, "paypal_product_id", None)
        if existing_product_id:
            return existing_product_id

        # Create new product
        access_token = await self._get_access_token()

        payload = {
            "name": "PMP 2026 Study Premium",
            "description": "Full access to all PMP 2026 study features",
            "type": "SERVICE",
            "category": "EDUCATION",
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                urljoin(self.base_url, "/v1/catalogs/products"),
                headers={**self._get_headers(), "Authorization": f"Bearer {access_token}"},
                json=payload,
            )

            if response.status_code not in (200, 201):
                raise PayPalAPIError(f"Failed to create product: {response.text}")

            data = response.json()
            return data["id"]

    async def cancel_subscription(
        self, subscription_id: str, reason: str = "User requested cancellation"
    ) -> dict[str, Any]:
        """
        Cancel an active subscription.

        Args:
            subscription_id: PayPal subscription ID
            reason: Reason for cancellation

        Returns:
            Cancellation response

        Raises:
            PayPalAPIError: If cancellation fails
        """
        access_token = await self._get_access_token()

        payload = {"reason": reason}

        async with httpx.AsyncClient() as client:
            response = await client.post(
                urljoin(self.base_url, f"/v1/billing/subscriptions/{subscription_id}/cancel"),
                headers={**self._get_headers(), "Authorization": f"Bearer {access_token}"},
                json=payload,
            )

            if response.status_code != 204:
                raise PayPalAPIError(f"Failed to cancel subscription: {response.text}")

            return {"status": "cancelled", "subscription_id": subscription_id}

    async def get_subscription_details(self, subscription_id: str) -> dict[str, Any]:
        """
        Get details of a subscription.

        Args:
            subscription_id: PayPal subscription ID

        Returns:
            Subscription details

        Raises:
            PayPalAPIError: If request fails
        """
        access_token = await self._get_access_token()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                urljoin(self.base_url, f"/v1/billing/subscriptions/{subscription_id}"),
                headers={**self._get_headers(), "Authorization": f"Bearer {access_token}"},
            )

            if response.status_code != 200:
                raise PayPalAPIError(f"Failed to get subscription details: {response.text}")

            return response.json()

    async def verify_webhook_signature(
        self,
        headers: dict[str, str],
        body: bytes | str,
        cert_id: str | None = None,
    ) -> dict[str, Any]:
        """
        Verify PayPal webhook signature.

        Args:
            headers: Request headers containing PayPal-Cert-Id and other signature headers
            body: Raw request body
            cert_id: Optional certificate ID (if not in headers)

        Returns:
            Verification result

        Raises:
            PayPalWebhookError: If verification fails
        """
        access_token = await self._get_access_token()
        cert_id = cert_id or headers.get("PAYPAL-CERT-ID", "")

        if not cert_id:
            raise PayPalWebhookError("Missing PayPal certificate ID")

        # Prepare verification payload
        verification_payload = {
            "cert_id": cert_id,
            "auth_algo": headers.get("PAYPAL-AUTH-ALGO", ""),
            "transmission_id": headers.get("PAYPAL-TRANSMISSION-ID", ""),
            "cert_url": headers.get("PAYPAL-CERT-URL", ""),
            "transmission_sig": headers.get("PAYPAL-TRANSMISSION-SIG", ""),
            "transmission_time": headers.get("PAYPAL-TRANSMISSION-TIME", ""),
            "webhook_id": getattr(settings, "paypal_webhook_id", ""),
            "webhook_event": body if isinstance(body, str) else body.decode("utf-8"),
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                urljoin(self.base_url, "/v1/notifications/verify-webhook-signature"),
                headers={**self._get_headers(), "Authorization": f"Bearer {access_token}"},
                json=verification_payload,
            )

            if response.status_code != 200:
                raise PayPalWebhookError(f"Webhook verification failed: {response.text}")

            data = response.json()
            return {"verified": data.get("verification_status") == "SUCCESS"}

    def parse_ipn_message(self, form_data: dict[str, str]) -> dict[str, Any]:
        """
        Parse PayPal IPN (Instant Payment Notification) message.

        Args:
            form_data: Raw form data from IPN POST

        Returns:
            Parsed IPN data

        Raises:
            PayPalWebhookError: If parsing fails
        """
        try:
            return {
                "txn_type": form_data.get("txn_type"),
                "subscr_id": form_data.get("subscr_id"),
                "payer_email": form_data.get("payer_email"),
                "payment_status": form_data.get("payment_status"),
                "mc_gross": form_data.get("mc_gross"),
                "mc_currency": form_data.get("mc_currency"),
                "custom": form_data.get("custom"),  # Can pass user_id here
                "ipn_track_id": form_data.get("ipn_track_id"),
                "raw": form_data,
            }
        except Exception as e:
            raise PayPalWebhookError(f"Failed to parse IPN message: {e}")

    async def verify_ipn(self, form_data: dict[str, str]) -> bool:
        """
        Verify PayPal IPN message authenticity.

        Args:
            form_data: Raw form data from IPN POST

        Returns:
            True if IPN is verified

        Raises:
            PayPalWebhookError: If verification fails
        """
        # Append cmd=_notify-validate for verification
        verify_data = {**form_data, "cmd": "_notify-validate"}

        async with httpx.AsyncClient() as client:
            if self.mode == "sandbox":
                response = await client.post(
                    "https://ipnpb.sandbox.paypal.com/cgi-bin/webscr",
                    data=verify_data,
                )
            else:
                response = await client.post(
                    "https://ipnpb.paypal.com/cgi-bin/webscr",
                    data=verify_data,
                )

            verified = response.text == "VERIFIED"
            if not verified:
                logger.warning(f"IPN verification failed: {response.text}")

            return verified


# Singleton instance
def get_paypal_service() -> PayPalService:
    """Get configured PayPal service instance."""
    return PayPalService()
