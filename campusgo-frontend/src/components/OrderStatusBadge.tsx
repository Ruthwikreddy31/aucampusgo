import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL } from '../utils/constants'
import type { OrderStatus } from '../models'

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`badge ${ORDER_STATUS_COLOR[status] ?? 'badge-primary'}`}>
      {ORDER_STATUS_LABEL[status] ?? status}
    </span>
  )
}
