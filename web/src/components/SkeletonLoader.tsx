interface SkeletonLoaderProps {
  count?: number
  className?: string
  type?: 'text' | 'card' | 'avatar' | 'line'
}

export function SkeletonLoader({ count = 1, className = '', type = 'text' }: SkeletonLoaderProps) {
  const typeClasses = {
    text: 'h-4 w-full',
    card: 'h-40 w-full',
    avatar: 'h-10 w-10 rounded-full',
    line: 'h-2 w-full',
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`skeleton ${typeClasses[type]}`} />
      ))}
    </div>
  )
}
