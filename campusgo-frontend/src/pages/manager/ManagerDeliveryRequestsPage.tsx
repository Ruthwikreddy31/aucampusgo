import { useEffect, useState, useCallback } from 'react'
import {
  Bike,
  GraduationCap,
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Search,
  FileText,
  AlertCircle,
  X,
  RefreshCw,
} from 'lucide-react'
import { deliveryApplicationService } from '../../services/deliveryApplicationService'
import type { DeliveryPartnerApplication, ApplicationStatus } from '../../models'
import LoadingSpinner from '../../components/LoadingSpinner'
import { toast } from 'sonner'

export default function ManagerDeliveryRequestsPage() {
  const [applications, setApplications] = useState<DeliveryPartnerApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Detail Modal & Action states
  const [selectedApp, setSelectedApp] = useState<DeliveryPartnerApplication | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false)
  const [correctionMessage, setCorrectionMessage] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Document preview lightbox modal
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string; isPdf?: boolean } | null>(null)

  const loadApplications = useCallback((isManual = false, isBackground = false) => {
    if (isManual) setIsRefreshing(true)
    else if (!isBackground) setLoading(true)
    const statusParam = selectedStatus === 'ALL' ? undefined : selectedStatus
    deliveryApplicationService.getAdminApplications(statusParam)
      .then((apps) => {
        setApplications(apps)
        if (isManual) toast.success(`Refreshed — ${apps.length} application(s) loaded.`)
      })
      .catch((err) => {
        console.error('Failed to load applications:', err)
        if (!isManual && !isBackground) toast.error('Failed to load delivery partner requests')
      })
      .finally(() => {
        if (!isBackground) setLoading(false)
        if (isManual) setIsRefreshing(false)
      })
  }, [selectedStatus])

  useEffect(() => {
    loadApplications()

    const handleUpdate = () => loadApplications(false, true)

    window.addEventListener('campusgo-delivery-apps-updated', handleUpdate)
    window.addEventListener('campusgo-application-submitted', handleUpdate)
    window.addEventListener('campusgo-application-approved', handleUpdate)
    window.addEventListener('storage', handleUpdate)

    // Auto-poll every 3 seconds in background to catch new submissions
    const interval = setInterval(() => loadApplications(false, true), 3000)

    return () => {
      window.removeEventListener('campusgo-delivery-apps-updated', handleUpdate)
      window.removeEventListener('campusgo-application-submitted', handleUpdate)
      window.removeEventListener('campusgo-application-approved', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
      clearInterval(interval)
    }
  }, [loadApplications])

  const handleApprove = async (id: number) => {
    setActionLoading(true)
    try {
      await deliveryApplicationService.approveApplication(id)
      toast.success('Application approved successfully! User is now a Delivery Partner.')
      setIsDetailOpen(false)
      loadApplications()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to approve application')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedApp) return
    if (!rejectionReason.trim()) {
      toast.error('Please enter a rejection reason')
      return
    }

    setActionLoading(true)
    try {
      await deliveryApplicationService.rejectApplication(selectedApp.id, rejectionReason.trim())
      toast.success('Application rejected. Feedback recorded.')
      setIsRejectModalOpen(false)
      setIsDetailOpen(false)
      setRejectionReason('')
      loadApplications()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reject application')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRequestCorrection = async () => {
    if (!selectedApp) return
    if (!correctionMessage.trim()) {
      toast.error('Please enter instructions for what needs correction')
      return
    }

    setActionLoading(true)
    try {
      await deliveryApplicationService.requestCorrection(selectedApp.id, correctionMessage.trim())
      toast.success('Correction request sent to applicant.')
      setIsCorrectionModalOpen(false)
      setIsDetailOpen(false)
      setCorrectionMessage('')
      loadApplications()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to request correction')
    } finally {
      setActionLoading(false)
    }
  }

  const filteredApps = applications.filter((app) => {
    const q = searchQuery.toLowerCase()
    return (
      app.userName.toLowerCase().includes(q) ||
      app.userEmail.toLowerCase().includes(q) ||
      app.applicantType.toLowerCase().includes(q)
    )
  })

  const pendingCount = applications.filter((a) => a.status === 'PENDING' || a.status === 'UNDER_REVIEW').length
  const correctionCount = applications.filter((a) => a.status === 'NEEDS_CORRECTION').length
  const approvedCount = applications.filter((a) => a.status === 'APPROVED').length
  const rejectedCount = applications.filter((a) => a.status === 'REJECTED').length

  return (
    <div className="page-enter p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-primary-light)] mb-1 uppercase tracking-wider">
            <Bike size={16} /> Partner Verification
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--color-text)]">
            Delivery Partner Requests
          </h1>
          <p className="text-sm font-medium text-[var(--color-text-muted)] mt-1">
            Review student ID cards, timetables, and worker identity documents before granting campus delivery access.
          </p>
        </div>

        {/* Refresh + Status Summary Pills */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadApplications(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] transition disabled:opacity-60"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-[var(--color-primary)]' : ''} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-center shadow-xs">
            <p className="text-xs font-bold text-[var(--color-text-muted)]">Pending</p>
            <p className="text-lg font-black text-amber-500">{pendingCount}</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-center shadow-xs">
            <p className="text-xs font-bold text-[var(--color-text-muted)]">Correction</p>
            <p className="text-lg font-black text-amber-600">{correctionCount}</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-center shadow-xs">
            <p className="text-xs font-bold text-[var(--color-text-muted)]">Approved</p>
            <p className="text-lg font-black text-emerald-500">{approvedCount}</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-center shadow-xs">
            <p className="text-xs font-bold text-[var(--color-text-muted)]">Rejected</p>
            <p className="text-lg font-black text-rose-500">{rejectedCount}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[var(--color-surface)] p-3 border border-[var(--color-border)]">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {(['ALL', 'PENDING', 'NEEDS_CORRECTION', 'APPROVED', 'REJECTED'] as const).map((st) => {
            const isActive = selectedStatus === st
            return (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]'
                }`}
              >
                {st === 'ALL' ? 'All Requests' : st === 'NEEDS_CORRECTION' ? 'Needs Correction' : st}
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email..."
            className="input-field rounded-full pl-9 pr-4 py-1.5 text-xs w-full"
          />
        </div>
      </div>

      {/* Applications List Table */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <LoadingSpinner size="lg" message="Loading delivery requests..." />
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="card p-12 text-center">
          <Bike size={36} className="text-[var(--color-text-subtle)] mx-auto mb-2 opacity-50" />
          <h3 className="text-lg font-bold text-[var(--color-text)]">No requests found</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            No delivery partner applications currently match your filter criteria.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden border border-[var(--color-border)] shadow-[var(--shadow-soft)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs font-extrabold text-[var(--color-text-muted)]">
                  <th className="py-3.5 px-4">Applicant</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Submitted Date</th>
                  <th className="py-3.5 px-4">Documents</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-[var(--color-surface-2)]/50 transition">
                    {/* Applicant */}
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-extrabold text-[var(--color-text)]">{app.userName}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{app.userEmail}</p>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        app.applicantType === 'STUDENT'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {app.applicantType === 'STUDENT' ? <GraduationCap size={13} /> : <Briefcase size={13} />}
                        {app.applicantType}
                      </span>
                    </td>

                    {/* Submitted Date */}
                    <td className="py-3.5 px-4 text-xs font-medium text-[var(--color-text-muted)]">
                      {new Date(app.submittedAt).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Documents */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
                        <FileText size={14} className="text-[var(--color-primary)]" />
                        <span>
                          {[
                            app.studentIdCardPath && 'ID',
                            app.timetablePath && 'Timetable',
                            app.identityDocumentPath && 'Aadhaar',
                            app.profilePhotoPath && 'Photo',
                          ].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold ${
                        app.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : app.status === 'REJECTED'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                      }`}>
                        {app.status === 'APPROVED' && <CheckCircle2 size={13} />}
                        {app.status === 'REJECTED' && <XCircle size={13} />}
                        {(app.status === 'PENDING' || app.status === 'UNDER_REVIEW') && <Clock size={13} />}
                        {app.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedApp(app)
                          setIsDetailOpen(true)
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-white px-3.5 py-1.5 text-xs font-bold text-[var(--color-primary)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition shadow-xs"
                      >
                        <Eye size={13} /> View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Application Details Modal */}
      {isDetailOpen && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-[32px] bg-white p-6 sm:p-8 shadow-2xl space-y-6 my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[var(--color-border)]">
              <div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold mb-1.5 ${
                  selectedApp.applicantType === 'STUDENT'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {selectedApp.applicantType === 'STUDENT' ? <GraduationCap size={13} /> : <Briefcase size={13} />}
                  {selectedApp.applicantType} Application
                </span>
                <h2 className="text-2xl font-black text-[var(--color-text)]">
                  {selectedApp.userName}
                </h2>
                <p className="text-xs text-[var(--color-text-muted)]">{selectedApp.userEmail}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* Application Meta */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl bg-[var(--color-surface-2)] p-3">
                <p className="font-bold text-[var(--color-text-muted)]">Submitted</p>
                <p className="font-extrabold text-[var(--color-text)] mt-0.5">
                  {new Date(selectedApp.submittedAt).toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl bg-[var(--color-surface-2)] p-3">
                <p className="font-bold text-[var(--color-text-muted)]">Current Status</p>
                <p className="font-extrabold text-[var(--color-text)] mt-0.5">{selectedApp.status}</p>
              </div>
              {selectedApp.rejectionReason && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 sm:col-span-3">
                  <p className="font-bold text-red-800">Rejection Reason</p>
                  <p className="font-semibold text-red-900 mt-0.5">{selectedApp.rejectionReason}</p>
                </div>
              )}
            </div>

            {/* Document Previews */}
            <div className="space-y-3">
              <p className="text-xs font-extrabold text-[var(--color-text)] uppercase tracking-wide">
                Submitted Verification Documents
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                {/* Student ID or Identity Doc */}
                {selectedApp.studentIdCardPath && (
                  <div className="rounded-2xl border border-[var(--color-border)] p-3 text-center bg-gray-50 space-y-2">
                    <p className="text-xs font-bold text-[var(--color-text)]">Student ID Card</p>
                    <img
                      src={deliveryApplicationService.getDocumentUrl(selectedApp.studentIdCardPath)}
                      alt="Student ID"
                      className="h-28 w-full rounded-lg object-cover border cursor-pointer hover:opacity-90 transition"
                      onClick={() => setPreviewDoc({
                        title: 'Student ID Card',
                        url: deliveryApplicationService.getDocumentUrl(selectedApp.studentIdCardPath),
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({
                        title: 'Student ID Card',
                        url: deliveryApplicationService.getDocumentUrl(selectedApp.studentIdCardPath),
                      })}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-primary)] hover:underline"
                    >
                      <Eye size={12} /> Full Screen
                    </button>
                  </div>
                )}

                {/* Worker Identity Doc */}
                {selectedApp.identityDocumentPath && (
                  <div className="rounded-2xl border border-[var(--color-border)] p-3 text-center bg-gray-50 space-y-2">
                    <p className="text-xs font-bold text-[var(--color-text)]">Identity Document (Aadhaar)</p>
                    <img
                      src={deliveryApplicationService.getDocumentUrl(selectedApp.identityDocumentPath)}
                      alt="Identity Doc"
                      className="h-28 w-full rounded-lg object-cover border cursor-pointer hover:opacity-90 transition"
                      onClick={() => setPreviewDoc({
                        title: 'Identity Verification Document',
                        url: deliveryApplicationService.getDocumentUrl(selectedApp.identityDocumentPath),
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({
                        title: 'Identity Verification Document',
                        url: deliveryApplicationService.getDocumentUrl(selectedApp.identityDocumentPath),
                      })}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-primary)] hover:underline"
                    >
                      <Eye size={12} /> Secure View
                    </button>
                  </div>
                )}

                {/* Timetable */}
                {selectedApp.timetablePath && (
                  <div className="rounded-2xl border border-[var(--color-border)] p-3 text-center bg-gray-50 space-y-2">
                    <p className="text-xs font-bold text-[var(--color-text)]">College Timetable</p>
                    <img
                      src={deliveryApplicationService.getDocumentUrl(selectedApp.timetablePath)}
                      alt="Timetable"
                      className="h-28 w-full rounded-lg object-cover border cursor-pointer hover:opacity-90 transition"
                      onClick={() => setPreviewDoc({
                        title: 'College Timetable',
                        url: deliveryApplicationService.getDocumentUrl(selectedApp.timetablePath),
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({
                        title: 'College Timetable',
                        url: deliveryApplicationService.getDocumentUrl(selectedApp.timetablePath),
                      })}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-primary)] hover:underline"
                    >
                      <Eye size={12} /> Inspect
                    </button>
                  </div>
                )}

                {/* Profile Photo */}
                {selectedApp.profilePhotoPath && (
                  <div className="rounded-2xl border border-[var(--color-border)] p-3 text-center bg-gray-50 space-y-2">
                    <p className="text-xs font-bold text-[var(--color-text)]">Live Photo</p>
                    <img
                      src={deliveryApplicationService.getDocumentUrl(selectedApp.profilePhotoPath)}
                      alt="Live Photo"
                      className="h-28 w-28 mx-auto rounded-full object-cover border cursor-pointer hover:opacity-90 transition"
                      onClick={() => setPreviewDoc({
                        title: 'Live Selfie Photo',
                        url: deliveryApplicationService.getDocumentUrl(selectedApp.profilePhotoPath),
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({
                        title: 'Live Selfie Photo',
                        url: deliveryApplicationService.getDocumentUrl(selectedApp.profilePhotoPath),
                      })}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-primary)] hover:underline block"
                    >
                      <Eye size={12} /> View
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="btn-secondary text-xs"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionLoading || selectedApp.status === 'REJECTED'}
                  onClick={() => setIsRejectModalOpen(true)}
                  className="rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-extrabold text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={actionLoading || selectedApp.status === 'APPROVED'}
                  onClick={() => setIsCorrectionModalOpen(true)}
                  className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-extrabold text-amber-700 hover:bg-amber-100 transition disabled:opacity-50"
                >
                  Request Correction
                </button>
                <button
                  type="button"
                  disabled={actionLoading || selectedApp.status === 'APPROVED'}
                  onClick={() => handleApprove(selectedApp.id)}
                  className="btn-primary px-5 py-2.5 text-xs inline-flex items-center gap-1.5 shadow-[var(--shadow-coral)] disabled:opacity-50"
                >
                  <CheckCircle2 size={15} /> Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Prompt Modal */}
      {isRejectModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-red-600 flex items-center gap-2">
                <AlertCircle size={20} /> Reject Application
              </h3>
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[var(--color-text-muted)]">
              Please provide a clear reason for rejecting <strong>{selectedApp.userName}</strong>'s application. The applicant will see this reason to correct their documents.
            </p>

            <div>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Student ID card photo is blurry. Please upload a clear photo showing your roll number."
                rows={4}
                className="input-field rounded-2xl p-3 text-xs w-full resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || !rejectionReason.trim()}
                onClick={handleReject}
                className="rounded-full bg-red-600 text-white px-5 py-2 text-xs font-extrabold hover:bg-red-700 transition disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Correction Prompt Modal */}
      {isCorrectionModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-amber-600 flex items-center gap-2">
                <AlertCircle size={20} /> Request Document Correction
              </h3>
              <button
                type="button"
                onClick={() => setIsCorrectionModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[var(--color-text-muted)]">
              Specify what needs to be fixed for <strong>{selectedApp.userName}</strong> (e.g. upload a clearer student ID card). The applicant can resubmit the corrected document.
            </p>

            <div>
              <textarea
                value={correctionMessage}
                onChange={(e) => setCorrectionMessage(e.target.value)}
                placeholder="e.g. Please upload a clearer photo of your college ID card showing your name and roll number."
                rows={4}
                className="input-field rounded-2xl p-3 text-xs w-full resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCorrectionModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || !correctionMessage.trim()}
                onClick={handleRequestCorrection}
                className="rounded-full bg-amber-600 text-white px-5 py-2 text-xs font-extrabold hover:bg-amber-700 transition disabled:opacity-50"
              >
                {actionLoading ? 'Sending...' : 'Send Correction Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Document Viewer */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="relative max-w-4xl max-h-[90vh] rounded-[24px] bg-white p-4 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-3">
              <p className="font-extrabold text-sm text-[var(--color-text)]">{previewDoc.title}</p>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-auto flex-1 text-center">
              <img
                src={previewDoc.url}
                alt={previewDoc.title}
                className="max-h-[75vh] mx-auto rounded-xl object-contain shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
