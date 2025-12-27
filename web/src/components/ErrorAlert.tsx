interface ErrorAlertProps {
  error: string | null
  onDismiss?: () => void
  type?: 'error' | 'warning' | 'success' | 'info'
}

export function ErrorAlert({ error, onDismiss, type = 'error' }: ErrorAlertProps) {
  if (!error) return null

  const typeStyles = {
    error: 'error-box',
    warning: 'warning-box',
    success: 'success-box',
    info: 'info-box',
  }

  const icons = {
    error: '⚠️',
    warning: '⚡',
    success: '✅',
    info: 'ℹ️',
  }

  return (
    <div className={`${typeStyles[type]} flex items-start gap-3`}>
      <span className="text-lg flex-shrink-0">{icons[type]}</span>
      <div className="flex-1">
        <p>{error}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-lg leading-none flex-shrink-0 hover:opacity-75 transition-opacity"
        >
          ✕
        </button>
      )}
    </div>
  )
}
