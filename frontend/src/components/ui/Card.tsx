'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}

export type CardBodyProps = HTMLAttributes<HTMLDivElement>;

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  border?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default:
    'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm',
  elevated:
    'bg-white dark:bg-gray-900 shadow-lg dark:shadow-gray-900/30',
  outlined:
    'bg-transparent border border-gray-200 dark:border-gray-700',
  filled:
    'bg-gray-50 dark:bg-gray-800 border border-transparent',
};

const paddingStyles: Record<'none' | 'sm' | 'md' | 'lg', string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'none',
      hoverable = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'rounded-xl overflow-hidden';
    const hoverStyles = hoverable
      ? 'transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'
      : '';

    const classes = [
      baseStyles,
      variantStyles[variant],
      paddingStyles[padding],
      hoverStyles,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, action, className = '', children, ...props }, ref) => {
    const baseStyles = 'px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200 dark:border-gray-700';

    return (
      <div ref={ref} className={`${baseStyles} ${className}`} {...props}>
        {(title || subtitle || action) ? (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {title && (
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {subtitle}
                </p>
              )}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
          </div>
        ) : (
          children
        )}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className = '', children, ...props }, ref) => {
    const baseStyles = 'px-4 py-4 sm:px-6';

    return (
      <div ref={ref} className={`${baseStyles} ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

CardBody.displayName = 'CardBody';

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ border = true, className = '', children, ...props }, ref) => {
    const baseStyles = 'px-4 py-3 sm:px-6';
    const borderStyles = border ? 'border-t border-gray-200 dark:border-gray-700' : '';

    return (
      <div ref={ref} className={`${baseStyles} ${borderStyles} ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardBody, CardFooter };
export default Card;
