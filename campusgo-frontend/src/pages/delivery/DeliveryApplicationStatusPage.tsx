import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  FileText,
  GraduationCap,
  Briefcase,
  ShieldCheck,
  Bike,
  Sparkles,
  ChevronRight,
  IndianRupee,
  Info,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { toast } from 'sonner'
import { deliveryApplicationService } from '../../services/deliveryApplicationService'
import LoadingSpinner from '../../components/LoadingSpinner'
import type { DeliveryPartnerApplication } from '../../models'
import { hasRole } from '../../utils/roles'

export default function DeliveryApplicationStatusPage() {
  const { user, refreshUser } = useAuthStore()
  const navigate = useNavigate()
  const [application, setApplication] = useState<DeliveryPartnerApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [openingDashboard, setOpeningDashboard] = useState(false)

  const fetchStatus = useCallback(async (isManualRefresh = false, isBackground = false) => {
    if (isManualRefresh) setRefreshing(true)
    else if (!isBackground) setLoading(true)

    try {
      const app = await deliveryApplicationService.getMyStatus()
      setApplication(app)

      // If approved, refresh the user state so DELIVERY_PARTNER role is synced
      if (app && app.status === 'APPROVED') {
        await refreshUser()
      }
    } catch (err) {
      console.error('Error fetching application status:', err)
    } finally {
      if (!isBackground) setLoading(false)
      if (isManualRefresh) setRefreshing(false)
    }
  }, [refreshUser])

  const handleOpenDashboard = async () => {
    setOpeningDashboard(true)
    try {
      await fetchStatus(true)
      const freshUser = await refreshUser()
      if (hasRole(freshUser, 'DELIVERY_PARTNER')) {
        navigate('/delivery', { replace: true })
      } else {
        toast.error('Partner access is approved but has not synced yet. Please refresh and try again.')
      }
    } finally {
      setOpeningDashboard(false)
    }
  }

  useEffect(() => {
    if (!user) {
      navigate('/delivery/register')
      return
    }
    fetchStatus()

    // Real-time synchronization listeners
    const handleSync = () => {
      fetchStatus(false, true)
    }

    window.addEventListener('campusgo-delivery-apps-updated', handleSync)
    window.addEventListener('campusgo-application-approved', handleSync)
    window.addEventListener('campusgo-user-updated', handleSync)
    window.addEventListener('storage', handleSync)

    // Polling every 2.5s for instant admin approval response
    const interval = setInterval(() => {
      fetchStatus(false, true)
    }, 2500)

    return () => {
      window.removeEventListener('campusgo-delivery-apps-updated', handleSync)
      window.removeEventListener('campusgo-application-approved', handleSync)
      window.removeEventListener('campusgo-user-updated', handleSync)
      window.removeEventListener('storage', handleSync)
      clearInterval(interval)
    }
  }, [user, navigate, fetchStatus])

  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <LoadingSpinner size="lg" message="Checking your delivery application status..." />
      </div>
    )
  }

  if (!application) {
    return (
      <div className="page-enter mx-auto max-w-lg py-12 px-4 text-center">
        <div className="rounded-[30px] border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-soft)]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
            <Bike size={32} />
          </div>
          <h2 className="text-2xl font-extrabold text-[var(--color-text)]">No Application Found</h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)] leading-relaxed">
            You haven't submitted a campus delivery partner application yet. Earn ₹15 per delivery during your free hours!
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              to="/delivery/register"
              className="btn-primary inline-flex items-center justify-center gap-2 py-3 shadow-[var(--shadow-coral)]"
            >
              Apply to Become a Delivery Partner <ArrowRight size={16} />
            </Link>
            <Link
              to="/home"
              className="text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] pt-2"
            >
              ← Back to CampusGo
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isApproved =
    application.status === 'APPROVED' ||
    user?.role === 'DELIVERY_PARTNER' ||
    Boolean(user?.roles && (Array.isArray(user.roles) ? user.roles.includes('DELIVERY_PARTNER') : false))

  const { status, applicantType, rejectionReason, submittedAt } = application

  return (
    <div className="page-enter mx-auto max-w-2xl py-8 sm:py-12 px-4 space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
            CampusGo Delivery Program
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text)]">
            Track Application
          </h1>
        </div>
        <button
          type="button"
          onClick={() => fetchStatus(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white px-3.5 py-1.5 text-xs font-bold text-[var(--color-text)] shadow-xs hover:bg-[var(--color-surface-2)] transition disabled:opacity-50"
          title="Refresh application status"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin text-[var(--color-primary)]' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* ── 1. APPROVED STATE: Admin Approved -> Can Deliver ── */}
      {isApproved && (
        <div className="space-y-6">
          <div className="rounded-[32px] border-2 border-emerald-300 bg-gradient-to-b from-emerald-50/70 via-white to-white p-6 sm:p-10 text-center shadow-[var(--shadow-soft)] relative overflow-hidden">
            {/* Sparkle decorative */}
            <div className="absolute top-4 right-4 text-emerald-400 opacity-60">
              <Sparkles size={28} />
            </div>

            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
              <CheckCircle2 size={46} strokeWidth={2.4} />
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 border border-emerald-300 px-4 py-1.5 text-xs font-extrabold text-emerald-800 tracking-wide uppercase">
              🟢 Application Approved
            </div>

            <h2 className="mt-3 text-3xl sm:text-4xl font-black text-emerald-950">
              You're Approved to Deliver!
            </h2>

            <p className="mt-3 text-sm sm:text-base font-medium text-emerald-900/80 max-w-lg mx-auto leading-relaxed">
              Congratulations! Your delivery partner application has been verified and approved by the campus admin. You are now authorized to accept orders and start delivering.
            </p>

            {/* Delivery Perks Grid */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs">
                  <IndianRupee size={15} /> Earnings
                </div>
                <p className="mt-1 text-base font-black text-emerald-950">₹15 / order</p>
                <p className="text-[11px] font-semibold text-emerald-700">Instant credit</p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs">
                  <Bike size={15} /> Zone
                </div>
                <p className="mt-1 text-base font-black text-emerald-950">Campus Only</p>
                <p className="text-[11px] font-semibold text-emerald-700">Maheshwaram, Narsampet, Warangal</p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs">
                  <ShieldCheck size={15} /> Access
                </div>
                <p className="mt-1 text-base font-black text-emerald-950">Authorized</p>
                <p className="text-[11px] font-semibold text-emerald-700">Deliveries enabled</p>
              </div>
            </div>

            {/* Main Action Button */}
            <div className="mt-8">
              <button
                type="button"
                onClick={handleOpenDashboard}
                disabled={openingDashboard}
                className="btn-primary inline-flex items-center justify-center gap-3 px-8 py-4 text-base font-extrabold shadow-lg shadow-emerald-500/20 w-full sm:w-auto disabled:cursor-wait disabled:opacity-70"
              >
                {openingDashboard ? <RefreshCw size={18} className="animate-spin" /> : <Bike size={20} />}
                <span>{openingDashboard ? 'Syncing partner access...' : 'Go to Delivery Dashboard'}</span>
                <ChevronRight size={18} />
              </button>
              <p className="mt-2 text-xs font-semibold text-emerald-700">
                Your approved partner access will sync before the dashboard opens.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. REJECTED STATE: Admin Rejected -> Give Rejection Feedback ── */}
      {status === 'REJECTED' && (
        <div className="space-y-6">
          <div className="rounded-[32px] border-2 border-red-300 bg-gradient-to-b from-red-50/70 via-white to-white p-6 sm:p-10 text-center shadow-[var(--shadow-soft)] relative overflow-hidden">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 shadow-inner">
              <XCircle size={46} strokeWidth={2.4} />
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-red-100/90 border border-red-300 px-4 py-1.5 text-xs font-extrabold text-red-800 tracking-wide uppercase">
              🔴 Application Decision
            </div>

            <h2 className="mt-3 text-3xl sm:text-4xl font-black text-red-950">
              Your Application Has Been Rejected
            </h2>

            <p className="mt-3 text-sm sm:text-base font-medium text-red-900/80 max-w-lg mx-auto leading-relaxed">
              We're sorry, your application to become a delivery partner was reviewed by the campus administrator and could not be approved at this time.
            </p>

            {/* Rejection Reason Alert Card */}
            <div className="mt-6 rounded-2xl bg-red-50 border-2 border-red-200 p-5 text-left space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-red-800">
                <AlertTriangle size={16} className="text-red-600" />
                Reason for Rejection by Admin
              </div>
              <p className="text-sm sm:text-base font-bold text-red-950 bg-white/80 p-3 rounded-xl border border-red-100 leading-relaxed">
                "{rejectionReason || 'The submitted student ID card or timetable documents were unclear or could not be verified with college records.'}"
              </p>
              <p className="text-xs font-semibold text-red-700 pt-1">
                💡 <span className="font-bold">Next Steps:</span> Please re-upload clearer photos of your valid college ID card and current class timetable to get approved.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/delivery/register?edit=true"
                className="btn-primary inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-extrabold w-full sm:w-auto shadow-md"
              >
                <RefreshCw size={16} /> Reapply with Corrected Documents
              </Link>
              <Link
                to="/home"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-6 py-3 text-sm font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition w-full sm:w-auto"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── 2B. NEEDS CORRECTION STATE ── */}
      {status === 'NEEDS_CORRECTION' && (
        <div className="space-y-6">
          <div className="rounded-[32px] border-2 border-amber-300 bg-gradient-to-b from-amber-50/70 via-white to-white p-6 sm:p-10 text-center shadow-[var(--shadow-soft)] relative overflow-hidden">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-inner">
              <AlertTriangle size={46} strokeWidth={2.4} />
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100/90 border border-amber-300 px-4 py-1.5 text-xs font-extrabold text-amber-800 tracking-wide uppercase">
              ⚠️ Needs Document Correction
            </div>

            <h2 className="mt-3 text-3xl sm:text-4xl font-black text-amber-950">
              Action Required: Document Correction
            </h2>

            <p className="mt-3 text-sm sm:text-base font-medium text-amber-900/80 max-w-lg mx-auto leading-relaxed">
              The administrator reviewed your application and requested corrections. Please update the requested document to proceed with approval.
            </p>

            {/* Correction Message Alert Card */}
            <div className="mt-6 rounded-2xl bg-amber-50 border-2 border-amber-200 p-5 text-left space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-800">
                <Info size={16} className="text-amber-600" />
                Admin Feedback / Correction Required
              </div>
              <p className="text-sm sm:text-base font-bold text-amber-950 bg-white/80 p-3 rounded-xl border border-amber-100 leading-relaxed">
                "{application.correctionMessage || 'Please upload a clearer image of your document.'}"
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/delivery/register?edit=true"
                className="btn-primary inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-extrabold w-full sm:w-auto shadow-md"
              >
                <RefreshCw size={16} /> Update & Resubmit Document
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. PENDING / UNDER_REVIEW STATE: Pending Admin Review ── */}
      {!isApproved && (status === 'PENDING' || status === 'UNDER_REVIEW') && (
        <div className="space-y-6">
          <div className="rounded-[32px] border-2 border-amber-300 bg-gradient-to-b from-amber-50/70 via-white to-white p-6 sm:p-10 text-center shadow-[var(--shadow-soft)] relative overflow-hidden">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-inner animate-pulse">
              <Clock size={44} strokeWidth={2.4} />
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 border border-amber-300 px-4 py-1.5 text-xs font-extrabold text-amber-800 tracking-wide uppercase">
              🟡 Status: Pending Admin Approval
            </div>

            <h2 className="mt-3 text-3xl sm:text-4xl font-black text-amber-950">
              Application Under Review
            </h2>

            <p className="mt-3 text-sm sm:text-base font-medium text-amber-900/80 max-w-lg mx-auto leading-relaxed">
              Your application has been received and is waiting for administrator approval. Once approved, you can start delivering orders immediately.
            </p>

            {/* 3-Step Visual Progress Stepper */}
            <div className="mt-8 rounded-2xl bg-white border border-amber-200 p-5 text-left shadow-xs">
              <p className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-4">
                Verification Progress
              </p>

              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--color-text)]">1. Application Submitted</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Submitted on {new Date(submittedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white animate-pulse">
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-900">2. Admin Verification (In Progress)</p>
                    <p className="text-xs text-amber-700">
                      Campus admin is reviewing your college ID and timetable slots.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 opacity-60">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-500">
                    <Bike size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-700">3. Delivery Authorization</p>
                    <p className="text-xs text-gray-500">
                      Unlocks delivery dashboard & order assignment upon admin approval.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/delivery/register?edit=true"
                className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold shadow-sm"
              >
                ✏️ Update Documents
              </Link>
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm('Are you sure you want to withdraw this application? You can submit a fresh application at any time.')) {
                    try {
                      await deliveryApplicationService.cancelMyApplication()
                      navigate('/delivery/register')
                    } catch (err) {
                      console.error('Failed to cancel application:', err)
                    }
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition"
              >
                Withdraw Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application Details Summary */}
      <div className="rounded-[28px] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-soft)] space-y-4">
        <h3 className="text-base font-extrabold text-[var(--color-text)] flex items-center gap-2">
          <FileText size={18} className="text-[var(--color-primary)]" />
          Application Details
        </h3>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl bg-[var(--color-surface-2)] p-3">
            <p className="font-bold text-[var(--color-text-muted)]">Applicant Type</p>
            <p className="mt-1 font-extrabold text-sm flex items-center gap-1 text-[var(--color-text)]">
              {applicantType === 'STUDENT' ? (
                <>
                  <GraduationCap size={15} className="text-indigo-600" /> Student Partner
                </>
              ) : (
                <>
                  <Briefcase size={15} className="text-amber-600" /> Campus Staff
                </>
              )}
            </p>
          </div>

          <div className="rounded-xl bg-[var(--color-surface-2)] p-3">
            <p className="font-bold text-[var(--color-text-muted)]">Submitted Date</p>
            <p className="mt-1 font-extrabold text-sm text-[var(--color-text)]">
              {new Date(submittedAt).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Uploaded Documents List */}
        <div className="space-y-2 pt-1">
          <p className="text-xs font-bold text-[var(--color-text-muted)]">Uploaded Verification Files</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {application.studentIdCardPath && (
              <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-2.5 bg-gray-50/80">
                <span className="font-bold flex items-center gap-2">
                  <FileText size={14} className="text-[var(--color-primary)]" /> Student ID Card
                </span>
                <span className="text-[10px] font-extrabold text-emerald-600">Attached</span>
              </div>
            )}
            {application.timetablePath && (
              <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-2.5 bg-gray-50/80">
                <span className="font-bold flex items-center gap-2">
                  <FileText size={14} className="text-[var(--color-primary)]" /> Timetable
                </span>
                <span className="text-[10px] font-extrabold text-emerald-600">Attached</span>
              </div>
            )}
            {application.identityDocumentPath && (
              <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-2.5 bg-gray-50/80">
                <span className="font-bold flex items-center gap-2">
                  <FileText size={14} className="text-[var(--color-primary)]" /> Identity Doc
                </span>
                <span className="text-[10px] font-extrabold text-emerald-600">Encrypted</span>
              </div>
            )}
            {application.profilePhotoPath && (
              <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-2.5 bg-gray-50/80">
                <span className="font-bold flex items-center gap-2">
                  <FileText size={14} className="text-[var(--color-primary)]" /> Live Photo
                </span>
                <span className="text-[10px] font-extrabold text-emerald-600">Attached</span>
              </div>
            )}
          </div>
        </div>

        <div className="pt-2 text-center">
          <Link
            to="/home"
            className="text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
          >
            ← Return to CampusGo Home
          </Link>
        </div>
      </div>
    </div>
  )
}
