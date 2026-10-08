interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
}

export default function LoadingSpinner({ size = 'md', message }: LoadingSpinnerProps) {
  const dim = size === 'sm' ? 24 : size === 'lg' ? 56 : 40
  const stroke = size === 'sm' ? 2 : 3

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <svg
        width={dim} height={dim}
        viewBox="0 0 50 50"
        className="animate-spin"
        style={{ animationDuration: '0.8s' }}
      >
        <circle
          cx="25" cy="25" r="20"
          fill="none"
          stroke="rgba(108,60,225,0.2)"
          strokeWidth={stroke * 2}
        />
        <circle
          cx="25" cy="25" r="20"
          fill="none"
          stroke="url(#spinGrad)"
          strokeWidth={stroke * 2}
          strokeLinecap="round"
          strokeDasharray="80 50"
        />
        <defs>
          <linearGradient id="spinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6C3CE1" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </svg>
      {message && (
        <p className="text-sm text-[var(--color-text-muted)] animate-pulse">{message}</p>
      )}
    </div>
  )
}

export function PageLoader({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-4 bg-[var(--color-bg)]">
      <div className="text-2xl font-black gradient-text-primary mb-2">CampusGo</div>
      <LoadingSpinner size="lg" message={message} />
    </div>
  )
}
