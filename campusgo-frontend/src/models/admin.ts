// ─── Admin Models ─────────────────────────────────────────────────────────────

export interface AdminDashboardData {
  totalUsers: number
  totalStudents: number
  totalWorkers: number
  deliveryPartners: number
  pendingRequests: number
  approvedApplications: number
  rejectedApplications: number
  todayOrders: number
  totalOrders: number
  activeOrders: number
  completedOrders: number
  cancelledOrders: number
  todayRevenue: number
  monthlyRevenue: number
  activeShops: number
  totalProducts: number
  openComplaints: number
}

export interface AdminDeliveryPartner {
  id: number
  userId: number
  name: string
  email: string
  phone?: string
  availabilityStatus: 'AVAILABLE' | 'BUSY' | 'OFFLINE'
  partnerStatus: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'
  suspensionReason?: string
  joinedAt: string
  completedOrders: number
  cancelledOrders: number
  totalEarnings: number
  applicantType: 'STUDENT' | 'WORKER'
  studentAvailability?: string
  profilePhotoPath?: string
  studentIdCardPath?: string
  timetablePath?: string
  identityDocumentPath?: string
}

export interface AdminPayment {
  id: string
  orderId: number
  studentName: string
  studentEmail: string
  amount: number
  paymentMethod: string
  paymentStatus: 'PAID' | 'REFUNDED' | 'PENDING'
  createdAt: string
}

export interface AdminComplaint {
  id: number
  user: {
    id: number
    name: string
    email: string
  }
  orderId?: number
  category: string
  subject: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED'
  resolutionNotes?: string
  resolvedBy?: string
  resolvedAt?: string
  createdAt: string
}

export interface AdminNotification {
  id: number
  title: string
  message: string
  targetAudience: string
  sentBy?: string
  sentAt: string
}

export interface AdminAuditLog {
  id: number
  adminEmail: string
  action: string
  targetType?: string
  targetId?: string
  details?: string
  timestamp: string
}
