import { useEffect } from 'react'
import { useNotificationStore } from '../../store/notificationStore'
import PageHeader from '../../components/PageHeader'
import LoadingSpinner from '../../components/LoadingSpinner'
import { Bell, CheckCheck } from 'lucide-react'
import { format } from 'date-fns'
import type { NotificationType } from '../../models'

const notifIcon: Record<NotificationType, string> = {
  ORDER_PLACED: '🧾', ORDER_ACCEPTED: '✅', ORDER_PREPARING: '👨‍🍳',
  ORDER_READY: '📦', DELIVERY_ASSIGNED: '🛵', OUT_FOR_DELIVERY: '🚀',
  DELIVERED: '🎉', CANCELLED: '❌', GENERAL: '🔔',
}

export default function NotificationsPage() {
  const { notifications, loading, fetchAll, markRead, markAllRead, unreadCount } = useNotificationStore()

  useEffect(() => { fetchAll() }, [])

  const unread = unreadCount()

  return (
    <div className="page-enter min-h-dvh bg-[var(--color-bg)]">
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : 'All caught up'}
        right={
          unread > 0 ? (
            <button onClick={markAllRead} className="btn-icon" title="Mark all read">
              <CheckCheck size={16} />
            </button>
          ) : undefined
        }
      />
      <div className="px-4 pt-3 pb-4 space-y-2 max-w-lg mx-auto">
        {loading && notifications.length === 0 ? (
          <div className="flex justify-center py-10"><LoadingSpinner /></div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-20 h-20 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center">
              <Bell size={32} className="text-[var(--color-text-subtle)]" />
            </div>
            <p className="font-semibold text-[var(--color-text)]">No notifications</p>
            <p className="text-sm text-[var(--color-text-subtle)]">You're all caught up!</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => !notif.read && markRead(notif.id)}
              className={`card p-3 cursor-pointer flex items-start gap-3 transition-all
                ${!notif.read ? 'border-[rgba(108,60,225,0.4)] bg-[rgba(108,60,225,0.06)]' : ''}`}
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-2)] flex items-center justify-center text-xl flex-shrink-0">
                {notifIcon[notif.type] ?? '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold ${notif.read ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text)]'}`}>
                    {notif.title}
                  </p>
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] flex-shrink-0 mt-1.5" />
                  )}
                </div>
                <p className="text-xs text-[var(--color-text-subtle)] mt-0.5 leading-relaxed">{notif.message}</p>
                <p className="text-xs text-[var(--color-text-subtle)] mt-1">
                  {format(new Date(notif.createdAt), 'dd MMM, hh:mm a')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
