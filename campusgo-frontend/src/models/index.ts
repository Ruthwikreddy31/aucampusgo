// ─── User & Auth ──────────────────────────────────────────────────────────────

export type UserRole = 'STUDENT' | 'STORE_STAFF' | 'CANTEEN_MEMBER' | 'DELIVERY_PARTNER' | 'ADMIN' | 'MANAGER'

export type ApplicantType = 'STUDENT' | 'WORKER'

export type ApplicationStatus = 'PENDING' | 'UNDER_REVIEW' | 'NEEDS_CORRECTION' | 'APPROVED' | 'REJECTED'

export interface DeliveryPartnerApplication {
  id: number
  userId: number
  userName: string
  userEmail: string
  userPhone?: string
  applicantType: ApplicantType
  status: ApplicationStatus
  studentIdCardPath?: string
  timetablePath?: string
  identityDocumentPath?: string
  profilePhotoPath?: string
  submittedAt: string
  reviewedAt?: string
  reviewedByName?: string
  rejectionReason?: string
  correctionMessage?: string
  previousApplicationId?: number
  studentAvailability?: string
}

export interface User {
  id: number
  name: string
  email: string
  phone: string
  roles: UserRole[]
  role?: UserRole | 'DELIVERY_AGENT' | 'MANAGER'
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface Student {
  id: number
  userId: number
  rollNumber: string
  department: string
  year: number
  block: string
  user: User
}

export interface DeliveryAgent {
  id: number
  userId: number
  employeeId: string
  availabilityStatus: 'AVAILABLE' | 'BUSY' | 'OFFLINE'
  currentLatitude?: number
  currentLongitude?: number
  user: User
}

export interface AuthResponse {
  token: string
  user: User
}

export interface LoginRequest {
  email: string
  password: string
}

// ─── Shop ─────────────────────────────────────────────────────────────────────

export interface Shop {
  id: number
  name: string
  description: string
  category: string
  imageUrl: string
  open: boolean
  active: boolean
  preparationTime: number
  rating?: number
  location?: string
  openingTime?: string
  closingTime?: string
  createdAt: string
  updatedAt: string
}

// ─── Category ─────────────────────────────────────────────────────────────────

export interface Category {
  id: number
  name: string
  description: string
  imageUrl: string
  active: boolean
}

// ─── Product ──────────────────────────────────────────────────────────────────

export interface Product {
  id: number
  shopId: number
  categoryId: number
  name: string
  description: string
  price: number
  imageUrl: string
  available: boolean
  active: boolean
  shop?: Shop
  category?: Category
  createdAt: string
  updatedAt: string
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: number
  cartId: number
  productId: number
  quantity: number
  price: number
  product: Product
}

export interface Cart {
  id: number
  userId: number
  items: CartItem[]
  createdAt: string
  updatedAt: string
}

// ─── ZestModel Bidding & Wallet ────────────────────────────────────────────────

export type DeliveryRequestStatus =
  | 'OPEN'
  | 'BIDDING_CLOSED'
  | 'SELECTION_PENDING'
  | 'ASSIGNED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'COMPLETED'

export type BidStatus = 'ACTIVE' | 'SELECTED' | 'NOT_SELECTED' | 'EXPIRED' | 'CANCELLED'

export interface DeliveryBid {
  id: number
  orderId: number
  deliveryPartnerId: number
  deliveryPartnerName: string
  deliveryPartnerRating?: number
  deliveryPartnerCompletedDeliveries?: number
  rating?: number
  completedDeliveries?: number
  amount: number
  estimatedPickupTimeMinutes?: number
  estimatedDeliveryTimeMinutes?: number
  status: BidStatus
  submittedAt?: string
  expiresAt?: string
}

export interface DeliveryRequest {
  id: number
  orderId: number
  deadlineMinutes: number
  deadlineAt: string
  bidStartAt: string
  bidEndAt: string
  status: DeliveryRequestStatus
  bids: DeliveryBid[]
  selectedBidId?: number
  selectedBid?: DeliveryBid
  createdAt: string
  updatedAt: string
}

export interface DeliveryAssignment {
  id: number
  orderId: number
  deliveryPartnerId: number
  bidId: number
  assignedAt?: string
  expiresAt?: string
  confirmedAt?: string
  status: 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'REJECTED' | 'EXPIRED'
  createdAt?: string
  updatedAt?: string
}

export type DailyFeeStatus = 'PENDING' | 'PAID' | 'FAILED' | 'WAIVED'

export interface DeliveryPartnerDailyFee {
  id: number
  deliveryPartnerId: number
  date: string // YYYY-MM-DD
  amount: number // default ₹10
  status: DailyFeeStatus
  paymentReference?: string
  paidAt?: string
  createdAt: string
}

export type WalletTransactionType = 'DELIVERY_EARNING' | 'DAILY_FEE' | 'PLATFORM_FEE' | 'REFUND' | 'ADJUSTMENT'

export interface WalletTransaction {
  id: number
  userId: number
  type: WalletTransactionType
  amount: number
  referenceType: string
  referenceId?: string
  description: string
  createdAt: string
}

export interface DeliveryPartnerWallet {
  userId: number
  balance: number
  todayEarnings: number
  todayDailyFeePaid: boolean
  totalDeliveries: number
  rating: number
  transactions: WalletTransaction[]
}

// ─── Order ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'PLACED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'PREPARING'
  | 'PACKED'
  | 'READY_FOR_PICKUP'
  | 'DELIVERY_ASSIGNED'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'

export type PaymentMethod = 'CASH_ON_DELIVERY' | 'RAZORPAY'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'

export interface OrderItem {
  id: number
  orderId: number
  productId: number
  productName: string
  price: number
  quantity: number
  product?: Product
}

export interface Order {
  id: number
  orderNumber?: string
  userId: number
  shopId: number
  deliveryAgentId?: number
  subtotal?: number
  deliveryFee: number
  platformFee?: number
  discount?: number
  totalAmount: number
  customerName?: string
  customerPhone?: string
  deliveryLocation: string
  deliveryInstructions?: string
  deliveryDeadline?: string
  deliveryLatitude?: number
  deliveryLongitude?: number
  deadlineMinutes?: number
  deadlineAt?: string
  selectedBidId?: number
  selectedBid?: DeliveryBid
  // ZestModel bidding fields
  biddingStatus?: string // 'OPEN' | 'PARTNER_SELECTED' | 'ASSIGNED' | 'CLOSED'
  biddingDeadline?: string // ISO datetime when bidding window closes
  deliveryStatus?: string // 'WAITING_FOR_BIDDING' | 'WAITING_FOR_PARTNER_CONFIRMATION' | 'WAITING_FOR_PREPARATION' | 'READY_FOR_PICKUP' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
  selectedDeliveryPartnerId?: number // user ID of partner selected from bids
  preparationStatus?: string // 'READY_FOR_PICKUP' etc.
  latitude?: number
  longitude?: number
  pickupVerificationCode?: string
  pickupVerifiedAt?: string
  deliveryOtp?: string
  deliveryOtpVerified?: boolean
  rejectionReason?: string
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus
  deliveryProofPath?: string
  deliveredAt?: string
  review?: Review
  items: OrderItem[]
  shop?: Shop
  user?: User
  deliveryAgent?: DeliveryAgent
  createdAt: string
  updatedAt: string
}

export interface Review {
  id: number
  orderId: number
  customerId: number
  deliveryPartnerId?: number
  rating: number
  comment?: string
  createdAt: string
  updatedAt?: string
}

export interface PlaceOrderRequest {
  customerName?: string
  customerPhone?: string
  deliveryLocation: string
  deliveryInstructions?: string
  deliveryDeadline?: string
  deadlineMinutes?: number
  paymentMethod: PaymentMethod
  latitude?: number
  longitude?: number
  items: Array<{ productId: number; quantity: number }>
}

// ─── Notification ─────────────────────────────────────────────────────────────

export type NotificationType =
  | 'ORDER_PLACED'
  | 'ORDER_ACCEPTED'
  | 'ORDER_PREPARING'
  | 'ORDER_READY'
  | 'DELIVERY_ASSIGNED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'GENERAL'

export interface Notification {
  id: number
  userId: number
  title: string
  message: string
  type: NotificationType
  read: boolean
  createdAt: string
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalStudents: number
  totalOrders: number
  activeOrders: number
  todayRevenue: number
  activeShops: number
  deliveryAgents: number
}

export interface DailyRevenue {
  date: string
  revenue: number
  orders: number
}

export interface PopularProduct {
  productId: number
  productName: string
  shopName: string
  totalOrders: number
  imageUrl: string
}

export interface Analytics {
  dailyRevenue: DailyRevenue[]
  popularProducts: PopularProduct[]
  ordersByStatus: Record<OrderStatus, number>
}

// ─── API Pagination ───────────────────────────────────────────────────────────

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
}

export interface ApiError {
  message: string
  status: number
  errors?: Record<string, string>
}
