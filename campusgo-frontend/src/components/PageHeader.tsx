import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  back?: boolean | string
  right?: React.ReactNode
}

export default function PageHeader({ title, subtitle, back, right }: PageHeaderProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (typeof back === 'string') navigate(back)
    else navigate(-1)
  }

  return (
    <header className="sticky top-0 z-30 glass-strong px-4 pt-safe-top">
      <div className="flex items-center gap-3 py-3 max-w-lg mx-auto">
        {back !== undefined && (
          <button
            onClick={handleBack}
            className="btn-icon flex-shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-[var(--color-text)] truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-[var(--color-text-subtle)] truncate">{subtitle}</p>
          )}
        </div>
        {right && <div className="flex-shrink-0">{right}</div>}
      </div>
    </header>
  )
}
