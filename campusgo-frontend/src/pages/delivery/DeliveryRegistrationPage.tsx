import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  GraduationCap,
  Briefcase,
  Camera,
  UploadCloud,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Trash2,
  FileText,
  ShieldCheck,
  Lock,
  X,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { deliveryApplicationService } from '../../services/deliveryApplicationService'
import LoadingSpinner from '../../components/LoadingSpinner'
import { toast } from 'sonner'
import type { ApplicantType } from '../../models'

export default function DeliveryRegistrationPage() {
  const { user, openLoginModal } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isEditing = searchParams.get('edit') === 'true'

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [applicantType, setApplicantType] = useState<ApplicantType>('STUDENT')
  const [currentStep, setCurrentStep] = useState<number>(0) // 0: applicant type, then verification steps

  // Uploaded document paths
  const [studentIdCard, setStudentIdCard] = useState<{ filename: string; preview: string } | null>(null)
  const [timetable, setTimetable] = useState<{ filename: string; preview: string; isPdf?: boolean } | null>(null)
  const [identityDoc, setIdentityDoc] = useState<{ filename: string; preview: string; isPdf?: boolean } | null>(null)
  const [profilePhoto, setProfilePhoto] = useState<{ filename: string; preview: string } | null>(null)

  // Camera modal state
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [cameraTarget, setCameraTarget] = useState<'studentId' | 'timetable' | 'identity' | 'selfie' | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Check if user already has an application
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    deliveryApplicationService.getMyStatus()
      .then((app) => {
        if (app) {
          if (app.status === 'APPROVED') {
            navigate('/delivery')
          } else if ((app.status === 'PENDING' || app.status === 'UNDER_REVIEW') && !isEditing) {
            navigate('/delivery/status')
          } else {
            // Can stay here to reapply or edit, prefill existing data
            setApplicantType(app.applicantType)
            setCurrentStep(1)
            if (app.studentIdCardPath) {
              setStudentIdCard({
                filename: app.studentIdCardPath,
                preview: deliveryApplicationService.getDocumentUrl(app.studentIdCardPath),
              })
            }
            if (app.timetablePath) {
              setTimetable({
                filename: app.timetablePath,
                preview: deliveryApplicationService.getDocumentUrl(app.timetablePath),
                isPdf: app.timetablePath.toLowerCase().endsWith('.pdf'),
              })
            }
            if (app.identityDocumentPath) {
              setIdentityDoc({
                filename: app.identityDocumentPath,
                preview: deliveryApplicationService.getDocumentUrl(app.identityDocumentPath),
                isPdf: app.identityDocumentPath.toLowerCase().endsWith('.pdf'),
              })
            }
            if (app.profilePhotoPath) {
              setProfilePhoto({
                filename: app.profilePhotoPath,
                preview: deliveryApplicationService.getDocumentUrl(app.profilePhotoPath),
              })
            }
          }
        }
      })
      .catch((err) => {
        console.error('Error fetching application status:', err)
      })
      .finally(() => setLoading(false))
  }, [user, navigate, isEditing])

  // Camera cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async (target: 'studentId' | 'timetable' | 'identity' | 'selfie', mode: 'user' | 'environment' = 'environment') => {
    setCameraTarget(target)
    setFacingMode(mode)
    setIsCameraOpen(true)

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error('Camera access error:', err)
      toast.error(cameraTarget === 'selfie'
        ? 'Unable to access camera. Camera access is required for your live photo.'
        : 'Unable to access camera. Please use file upload instead.'
      )
      setIsCameraOpen(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setIsCameraOpen(false)
    setCameraTarget(null)
  }

  const capturePhoto = async () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(async (blob) => {
      if (!blob) return
      const filename = `${cameraTarget}_capture_${Date.now()}.jpg`
      const file = new File([blob], filename, { type: 'image/jpeg' })
      const previewUrl = URL.createObjectURL(blob)

      try {
        toast.loading('Uploading captured photo...', { id: 'upload' })
        const res = await deliveryApplicationService.uploadDocument(file)
        toast.success('Document uploaded successfully', { id: 'upload' })

        if (cameraTarget === 'studentId') {
          setStudentIdCard({ filename: res.filename, preview: previewUrl })
        } else if (cameraTarget === 'timetable') {
          setTimetable({ filename: res.filename, preview: previewUrl })
        } else if (cameraTarget === 'identity') {
          setIdentityDoc({ filename: res.filename, preview: previewUrl })
        } else if (cameraTarget === 'selfie') {
          setProfilePhoto({ filename: res.filename, preview: previewUrl })
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Failed to upload photo', { id: 'upload' })
        if (err?.response?.status === 401) {
          openLoginModal()
        }
      } finally {
        stopCamera()
      }
    }, 'image/jpeg', 0.9)
  }

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'studentId' | 'timetable' | 'identity' | 'selfie'
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (type === 'selfie') {
      toast.error('Live photo must be captured with the camera.')
      e.target.value = ''
      return
    }

    if (!user) {
      openLoginModal(() => {
        toast.info('Please re-select your document file.')
      })
      return
    }

    // Validation
    const isPdf = file.type === 'application/pdf'
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit')
      return
    }

    try {
      toast.loading(`Uploading ${file.name}...`, { id: 'upload' })
      const res = await deliveryApplicationService.uploadDocument(file)
      const previewUrl = isPdf ? '' : URL.createObjectURL(file)
      toast.success('Document uploaded successfully', { id: 'upload' })

      if (type === 'studentId') {
        setStudentIdCard({ filename: res.filename, preview: previewUrl })
      } else if (type === 'timetable') {
        setTimetable({ filename: res.filename, preview: previewUrl, isPdf })
      } else if (type === 'identity') {
        setIdentityDoc({ filename: res.filename, preview: previewUrl, isPdf })
      } else if (type === 'selfie') {
        setProfilePhoto({ filename: res.filename, preview: previewUrl })
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Upload failed', { id: 'upload' })
      if (err?.response?.status === 401) {
        openLoginModal()
      }
    }
  }

  const isStudentComplete = Boolean(studentIdCard?.filename && timetable?.filename && profilePhoto?.filename)
  const isWorkerComplete = Boolean(identityDoc?.filename && profilePhoto?.filename)

  const chooseApplicantType = (type: ApplicantType) => {
    setApplicantType(type)
    setCurrentStep(1)
  }

  const handleSubmitApplication = async () => {
    if (!applicantType) return

    if (!user) {
      openLoginModal(() => {
        toast.info('Please submit your application once logged in.')
      })
      return
    }

    if (applicantType === 'STUDENT') {
      if (!studentIdCard?.filename) {
        toast.error('Please upload your Student ID Card before submitting.')
        setCurrentStep(1)
        return
      }
      if (!timetable?.filename) {
        toast.error('Please upload your College Timetable before submitting.')
        setCurrentStep(2)
        return
      }
      if (!profilePhoto?.filename) {
        toast.error('Please take your Live Photo before submitting.')
        setCurrentStep(3)
        return
      }
    } else if (applicantType === 'WORKER') {
      if (!identityDoc?.filename) {
        toast.error('Please upload your Identity Document (Aadhaar / Staff ID) before submitting.')
        setCurrentStep(1)
        return
      }
      if (!profilePhoto?.filename) {
        toast.error('Please take your Live Photo before submitting.')
        setCurrentStep(2)
        return
      }
    }

    setSubmitting(true)
    try {
      await deliveryApplicationService.submit({
        applicantType,
        studentIdCardPath: studentIdCard?.filename,
        timetablePath: timetable?.filename,
        identityDocumentPath: identityDoc?.filename,
        profilePhotoPath: profilePhoto?.filename,
      })
      toast.success('Application submitted successfully!')
      navigate('/delivery/status')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <LoadingSpinner size="lg" message="Checking application details..." />
      </div>
    )
  }

  // Steps definitions based on applicant type (1-indexed)
  const steps = applicantType === 'STUDENT'
    ? ['Student ID', 'Timetable', 'Live Photo', 'Review']
    : ['Identity Doc', 'Live Photo', 'Review']

  return (
    <div className="page-enter mx-auto max-w-2xl py-6 sm:py-10 px-4">
      {/* Sign In Banner if not logged in */}
      {!user && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 shadow-xs">
          <div className="flex items-center gap-3">
            <Lock size={20} className="text-amber-600 shrink-0" />
            <div>
              <p className="font-extrabold text-sm">Sign in required to submit application</p>
              <p className="text-xs font-semibold text-amber-700">You can view the steps below, but sign-in is required to upload documents.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openLoginModal()}
            className="rounded-full bg-amber-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-amber-700 transition shadow-sm shrink-0"
          >
            Sign In Now &rarr;
          </button>
        </div>
      )}
      {/* Editing Mode Banner */}
      {isEditing && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900 shadow-xs">
          <div className="flex items-center gap-3">
            <RefreshCw size={20} className="text-blue-600 shrink-0" />
            <div>
              <p className="font-extrabold text-sm">Updating Application Documents</p>
              <p className="text-xs font-semibold text-blue-700">You can replace or re-upload your verification files and re-submit.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/delivery/status')}
            className="rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-extrabold text-white hover:bg-blue-700 transition shadow-sm shrink-0"
          >
            Cancel Edit
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#ECFFF5] px-4 py-1.5 text-xs font-bold text-[var(--color-success)] mb-3 border border-[#C6F6D5]">
          <Sparkles size={14} /> Earn While on Campus
        </div>
        <h1 className="text-3xl font-extrabold text-[var(--color-text)] sm:text-4xl">
          Become a Delivery Partner
        </h1>
        <p className="mt-2 text-sm sm:text-base font-medium text-[var(--color-text-muted)] max-w-lg mx-auto">
          Complete the verification steps below to submit your application for admin review.
        </p>

        {/* Applicant Type Toggle */}
        <div className="mx-auto mt-6 flex max-w-xs items-center rounded-2xl bg-[var(--color-surface-2)] p-1 border border-[var(--color-border)] shadow-xs">
          <button
            type="button"
            onClick={() => chooseApplicantType('STUDENT')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-extrabold transition cursor-pointer ${
              applicantType === 'STUDENT'
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <GraduationCap size={16} /> Student
          </button>
          <button
            type="button"
            onClick={() => chooseApplicantType('WORKER')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-extrabold transition cursor-pointer ${
              applicantType === 'WORKER'
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <Briefcase size={16} /> Worker
          </button>
        </div>
      </div>

      {/* Step Progress Bar */}
      {currentStep > 0 && (
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((stepLabel, idx) => {
            const stepNum = idx + 1
            const isDone = currentStep > stepNum
            const isCurrent = currentStep === stepNum
            return (
              <div key={stepLabel} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-extrabold transition-all duration-300 ${
                      isDone
                        ? 'bg-[var(--color-success)] text-white shadow-sm'
                        : isCurrent
                        ? 'bg-[var(--color-primary)] text-white shadow-[var(--shadow-coral)] scale-110'
                        : 'bg-[var(--color-surface-2)] text-[var(--color-text-subtle)] border border-[var(--color-border)]'
                    }`}
                  >
                    {isDone ? <CheckCircle2 size={18} /> : stepNum}
                  </div>
                  <span className="mt-1.5 text-[11px] font-bold text-[var(--color-text-muted)] hidden sm:block">
                    {stepLabel}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 rounded-full transition-all duration-300 ${
                      currentStep > stepNum ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border)]'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
      )}

      {/* STEP 0: Role Selection */}
      {currentStep === 0 && (
        <div className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Student Card */}
            <div
              onClick={() => chooseApplicantType('STUDENT')}
              className="group relative rounded-[28px] border-2 border-[var(--color-border)] bg-white p-7 shadow-[var(--shadow-soft)] transition-all duration-200 cursor-pointer hover:border-[var(--color-primary)] hover:shadow-xl hover:-translate-y-1"
            >
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
                <GraduationCap size={32} />
              </div>
              <h2 className="text-xl font-extrabold text-[var(--color-text)]">Student</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
                Deliver during your available free time between classes and hostel hours.
              </p>
              <div className="mt-6 flex items-center gap-2 text-sm font-extrabold text-[var(--color-primary)]">
                <span>Select Student</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Canteen Member / Worker Card */}
            <div
              onClick={() => chooseApplicantType('WORKER')}
              className="group relative rounded-[28px] border-2 border-[var(--color-border)] bg-white p-7 shadow-[var(--shadow-soft)] transition-all duration-200 cursor-pointer hover:border-[var(--color-primary)] hover:shadow-xl hover:-translate-y-1"
            >
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
                <Briefcase size={32} />
              </div>
              <h2 className="text-xl font-extrabold text-[var(--color-text)]">Canteen Member / Worker</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
                Deliver campus orders as an authorized staff member or canteen worker.
              </p>
              <div className="mt-6 flex items-center gap-2 text-sm font-extrabold text-[var(--color-primary)]">
                <span>Select Worker</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT STEP 1: Student ID Card */}
      {applicantType === 'STUDENT' && currentStep === 1 && (
        <div className="rounded-[30px] border border-[var(--color-border)] bg-white p-6 sm:p-8 shadow-[var(--shadow-soft)] space-y-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-primary)]">Step 1 of 4</span>
            <h2 className="text-2xl font-extrabold text-[var(--color-text)] mt-1">Upload Student ID Card</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Please provide a clear photo of your official college ID card. Ensure your name and roll number are readable.
            </p>
          </div>

          {studentIdCard ? (
            <div className="relative rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-center">
              <img
                src={studentIdCard.preview || deliveryApplicationService.getDocumentUrl(studentIdCard.filename)}
                alt="Student ID Card Preview"
                className="max-h-64 mx-auto rounded-xl object-contain shadow-sm"
              />
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setStudentIdCard(null)}
                  className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition"
                >
                  <Trash2 size={14} /> Remove / Retake
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-8 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[var(--color-primary)] shadow-sm">
                <GraduationCap size={32} />
              </div>
              <div>
                <p className="font-extrabold text-[var(--color-text)]">Upload or Snap Your ID Card</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Supports JPG, PNG up to 10MB</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => startCamera('studentId', 'environment')}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[var(--color-primary-hover)] transition"
                >
                  <Camera size={16} /> Take Photo
                </button>
                <label className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-5 py-2.5 text-xs font-extrabold text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] cursor-pointer transition shadow-xs">
                  <UploadCloud size={16} /> Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'studentId')}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setCurrentStep(0)}
              className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              type="button"
              disabled={!studentIdCard}
              onClick={() => setCurrentStep(2)}
              className={`btn-primary px-7 ${!studentIdCard ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STUDENT STEP 2: Timetable */}
      {applicantType === 'STUDENT' && currentStep === 2 && (
        <div className="rounded-[30px] border border-[var(--color-border)] bg-white p-6 sm:p-8 shadow-[var(--shadow-soft)] space-y-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-primary)]">Step 2 of 4</span>
            <h2 className="text-2xl font-extrabold text-[var(--color-text)] mt-1">Add Your Timetable</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Upload your current semester timetable image or PDF so CampusGo knows your free periods for deliveries.
            </p>
          </div>

          {timetable ? (
            <div className="relative rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-center">
              {timetable.isPdf ? (
                <div className="py-8 flex flex-col items-center">
                  <FileText size={48} className="text-[var(--color-primary)] mb-2" />
                  <p className="font-extrabold text-sm">{timetable.filename}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">PDF Document Uploaded</p>
                </div>
              ) : (
                <img
                  src={timetable.preview || deliveryApplicationService.getDocumentUrl(timetable.filename)}
                  alt="Timetable Preview"
                  className="max-h-64 mx-auto rounded-xl object-contain shadow-sm"
                />
              )}
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setTimetable(null)}
                  className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition"
                >
                  <Trash2 size={14} /> Remove / Replace
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-8 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[var(--color-primary)] shadow-sm">
                <FileText size={32} />
              </div>
              <div>
                <p className="font-extrabold text-[var(--color-text)]">Upload Your Timetable</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Accepts Images (JPG, PNG) or PDF files</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => startCamera('timetable', 'environment')}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[var(--color-primary-hover)] transition"
                >
                  <Camera size={16} /> Take Photo
                </button>
                <label className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-5 py-2.5 text-xs font-extrabold text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] cursor-pointer transition shadow-xs">
                  <UploadCloud size={16} /> Upload Image / PDF
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileUpload(e, 'timetable')}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              type="button"
              disabled={!timetable}
              onClick={() => setCurrentStep(3)}
              className={`btn-primary px-7 ${!timetable ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STUDENT STEP 3: Live Selfie Photo */}
      {applicantType === 'STUDENT' && currentStep === 3 && (
        <div className="rounded-[30px] border border-[var(--color-border)] bg-white p-6 sm:p-8 shadow-[var(--shadow-soft)] space-y-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-primary)]">Step 3 of 4</span>
            <h2 className="text-2xl font-extrabold text-[var(--color-text)] mt-1">Take Your Photo</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Please take a clear live selfie or headshot. This photo will appear on your delivery partner profile.
            </p>
          </div>

          {profilePhoto ? (
            <div className="relative rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-center">
              <img
                src={profilePhoto.preview || deliveryApplicationService.getDocumentUrl(profilePhoto.filename)}
                alt="Profile Photo Preview"
                className="h-52 w-52 mx-auto rounded-full object-cover border-4 border-white shadow-md"
              />
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setProfilePhoto(null)}
                  className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition"
                >
                  <RefreshCw size={14} /> Retake Photo
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-8 text-center space-y-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-[var(--color-primary)] shadow-sm">
                <Camera size={36} />
              </div>
              <div>
                <p className="font-extrabold text-[var(--color-text)]">Live Selfie / Headshot</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Make sure your face is clearly visible in good lighting</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => startCamera('selfie', 'user')}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[var(--color-primary-hover)] transition"
                >
                  <Camera size={16} /> Open Camera
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              type="button"
              disabled={!profilePhoto}
              onClick={() => setCurrentStep(4)}
              className={`btn-primary px-7 ${!profilePhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Review Application <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STUDENT STEP 4: Review Page */}
      {applicantType === 'STUDENT' && currentStep === 4 && (
        <div className="rounded-[30px] border border-[var(--color-border)] bg-white p-6 sm:p-8 shadow-[var(--shadow-soft)] space-y-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-primary)]">Final Step</span>
            <h2 className="text-2xl font-extrabold text-[var(--color-text)] mt-1">Review Your Application</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Verify your information and uploaded verification documents before submitting to the CampusGo Admin Portal.
            </p>
          </div>

          <div className="rounded-[24px] bg-[var(--color-surface-2)] p-5 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
              <div>
                <p className="text-xs font-bold text-[var(--color-text-muted)]">Applicant Name</p>
                <p className="text-base font-extrabold text-[var(--color-text)]">{user?.name || 'Student Applicant'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-[var(--color-text-muted)]">Applicant Type</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-extrabold text-indigo-700">
                  <GraduationCap size={14} /> Student
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-[var(--color-text-muted)]">College Email</p>
              <p className="text-sm font-semibold text-[var(--color-text)]">{user?.email || 'Registered Email'}</p>
            </div>
          </div>

          {/* Documents Review Grid */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* ID Card */}
            <div className="rounded-[20px] border border-[var(--color-border)] p-3 text-center bg-white space-y-2">
              <p className="text-xs font-extrabold text-[var(--color-text)]">Student ID Card</p>
              {studentIdCard ? (
                <img
                  src={studentIdCard.preview || deliveryApplicationService.getDocumentUrl(studentIdCard.filename)}
                  alt="Student ID"
                  className="h-24 w-full rounded-lg object-cover border"
                />
              ) : (
                <div className="h-24 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-red-200 bg-red-50/50 p-2">
                  <span className="text-[11px] font-bold text-red-600">ID Not Uploaded</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs font-bold text-[var(--color-primary)] hover:underline"
              >
                {studentIdCard ? 'Edit' : '+ Upload Now'}
              </button>
            </div>

            {/* Timetable */}
            <div className="rounded-[20px] border border-[var(--color-border)] p-3 text-center bg-white space-y-2">
              <p className="text-xs font-extrabold text-[var(--color-text)]">Timetable</p>
              {timetable ? (
                timetable.isPdf ? (
                  <div className="h-24 flex items-center justify-center rounded-lg border bg-gray-50">
                    <FileText size={28} className="text-[var(--color-primary)]" />
                  </div>
                ) : (
                  <img
                    src={timetable.preview || deliveryApplicationService.getDocumentUrl(timetable.filename)}
                    alt="Timetable"
                    className="h-24 w-full rounded-lg object-cover border"
                  />
                )
              ) : (
                <div className="h-24 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-red-200 bg-red-50/50 p-2">
                  <span className="text-[11px] font-bold text-red-600">Timetable Not Uploaded</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="text-xs font-bold text-[var(--color-primary)] hover:underline"
              >
                {timetable ? 'Edit' : '+ Upload Now'}
              </button>
            </div>

            {/* Profile Photo */}
            <div className="rounded-[20px] border border-[var(--color-border)] p-3 text-center bg-white space-y-2">
              <p className="text-xs font-extrabold text-[var(--color-text)]">Live Photo</p>
              {profilePhoto ? (
                <img
                  src={profilePhoto.preview || deliveryApplicationService.getDocumentUrl(profilePhoto.filename)}
                  alt="Profile"
                  className="h-24 w-24 mx-auto rounded-full object-cover border"
                />
              ) : (
                <div className="h-24 w-24 mx-auto flex flex-col items-center justify-center rounded-full border-2 border-dashed border-red-200 bg-red-50/50 p-2">
                  <span className="text-[10px] font-bold text-red-600 text-center">Photo Not Uploaded</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="text-xs font-bold text-[var(--color-primary)] hover:underline"
              >
                {profilePhoto ? 'Edit' : '+ Take Photo'}
              </button>
            </div>
          </div>

          {!isStudentComplete && (
            <div className="rounded-[20px] bg-red-50 border border-red-200 p-4 flex items-start gap-2.5 text-xs text-red-800">
              <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-red-900">Missing Required Verification Documents</p>
                <p>Please upload all required documents (Student ID, Timetable, and Live Photo) before you can submit your application.</p>
              </div>
            </div>
          )}

          <div className="rounded-[20px] bg-blue-50 border border-blue-100 p-4 flex items-start gap-3 text-xs text-blue-800">
            <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <span>
              Your documents are submitted directly to the CampusGo Admin Portal for verification. You will be notified once reviewed.
            </span>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              type="button"
              disabled={submitting || !isStudentComplete}
              onClick={handleSubmitApplication}
              className={`btn-primary px-8 inline-flex items-center gap-2 shadow-[var(--shadow-coral)] ${
                !isStudentComplete ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="sm" /> Submitting...
                </>
              ) : (
                <>
                  Submit Application <CheckCircle2 size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* WORKER STEP 1: Aadhaar Card / Identity Document */}
      {applicantType === 'WORKER' && currentStep === 1 && (
        <div className="rounded-[30px] border border-[var(--color-border)] bg-white p-6 sm:p-8 shadow-[var(--shadow-soft)] space-y-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-primary)]">Step 1 of 3</span>
            <h2 className="text-2xl font-extrabold text-[var(--color-text)] mt-1">Upload Identity Document (Aadhaar / Staff ID)</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Please upload your Aadhaar card or canteen staff verification document.
            </p>
          </div>

          {/* Privacy Requirement Notice */}
          <div className="rounded-[22px] bg-amber-50/80 border border-amber-200 p-4 flex items-start gap-3">
            <Lock size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <p className="font-extrabold">Privacy & Confidentiality Guarantee</p>
              <p>
                Aadhaar is highly sensitive. Documents are stored in an encrypted, restricted directory and are never publicly accessible. Only authorized campus administrators can review this for verification.
              </p>
            </div>
          </div>

          {identityDoc ? (
            <div className="relative rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-center">
              {identityDoc.isPdf ? (
                <div className="py-8 flex flex-col items-center">
                  <FileText size={48} className="text-[var(--color-primary)] mb-2" />
                  <p className="font-extrabold text-sm">{identityDoc.filename}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Encrypted PDF Uploaded</p>
                </div>
              ) : (
                <div className="relative max-w-sm mx-auto">
                  <img
                    src={identityDoc.preview || deliveryApplicationService.getDocumentUrl(identityDoc.filename)}
                    alt="Identity Document"
                    className="max-h-64 mx-auto rounded-xl object-contain shadow-sm"
                  />
                  <div className="absolute top-2 right-2 rounded-full bg-black/60 text-white px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs">
                    <Lock size={11} /> Secure Document
                  </div>
                </div>
              )}
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIdentityDoc(null)}
                  className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition"
                >
                  <Trash2 size={14} /> Remove / Replace
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-8 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[var(--color-primary)] shadow-sm">
                <Briefcase size={32} />
              </div>
              <div>
                <p className="font-extrabold text-[var(--color-text)]">Upload Aadhaar or Worker ID</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Supports JPG, PNG, PDF up to 10MB</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => startCamera('identity', 'environment')}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[var(--color-primary-hover)] transition"
                >
                  <Camera size={16} /> Take Photo
                </button>
                <label className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-5 py-2.5 text-xs font-extrabold text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] cursor-pointer transition shadow-xs">
                  <UploadCloud size={16} /> Upload Photo / PDF
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileUpload(e, 'identity')}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setCurrentStep(0)}
              className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              type="button"
              disabled={!identityDoc}
              onClick={() => setCurrentStep(2)}
              className={`btn-primary px-7 ${!identityDoc ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* WORKER STEP 2: Live Selfie Photo */}
      {applicantType === 'WORKER' && currentStep === 2 && (
        <div className="rounded-[30px] border border-[var(--color-border)] bg-white p-6 sm:p-8 shadow-[var(--shadow-soft)] space-y-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-primary)]">Step 2 of 3</span>
            <h2 className="text-2xl font-extrabold text-[var(--color-text)] mt-1">Take Your Photo</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Please provide a clear live photo of yourself.
            </p>
          </div>

          {profilePhoto ? (
            <div className="relative rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-center">
              <img
                src={profilePhoto.preview || deliveryApplicationService.getDocumentUrl(profilePhoto.filename)}
                alt="Profile Preview"
                className="h-52 w-52 mx-auto rounded-full object-cover border-4 border-white shadow-md"
              />
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setProfilePhoto(null)}
                  className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition"
                >
                  <RefreshCw size={14} /> Retake Photo
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-8 text-center space-y-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-[var(--color-primary)] shadow-sm">
                <Camera size={36} />
              </div>
              <div>
                <p className="font-extrabold text-[var(--color-text)]">Live Photo of Yourself</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Look straight at the camera with clear lighting</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => startCamera('selfie', 'user')}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[var(--color-primary-hover)] transition"
                >
                  <Camera size={16} /> Open Camera
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              type="button"
              disabled={!profilePhoto}
              onClick={() => setCurrentStep(3)}
              className={`btn-primary px-7 ${!profilePhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Review Application <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* WORKER STEP 3: Review Page */}
      {applicantType === 'WORKER' && currentStep === 3 && (
        <div className="rounded-[30px] border border-[var(--color-border)] bg-white p-6 sm:p-8 shadow-[var(--shadow-soft)] space-y-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-primary)]">Final Step</span>
            <h2 className="text-2xl font-extrabold text-[var(--color-text)] mt-1">Review Your Application</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Review your details and verification documents before final submission.
            </p>
          </div>

          <div className="rounded-[24px] bg-[var(--color-surface-2)] p-5 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
              <div>
                <p className="text-xs font-bold text-[var(--color-text-muted)]">Applicant Name</p>
                <p className="text-base font-extrabold text-[var(--color-text)]">{user?.name || 'Worker Applicant'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-[var(--color-text-muted)]">Applicant Type</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800">
                  <Briefcase size={14} /> Canteen Member / Worker
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-[var(--color-text-muted)]">Email</p>
              <p className="text-sm font-semibold text-[var(--color-text)]">{user?.email || 'Registered Email'}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Identity Document */}
            <div className="rounded-[20px] border border-[var(--color-border)] p-4 text-center bg-white space-y-2">
              <p className="text-xs font-extrabold text-[var(--color-text)]">Identity Document (Aadhaar / ID)</p>
              {identityDoc ? (
                identityDoc.isPdf ? (
                  <div className="h-28 flex items-center justify-center rounded-lg border bg-gray-50">
                    <FileText size={32} className="text-[var(--color-primary)]" />
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={identityDoc.preview || deliveryApplicationService.getDocumentUrl(identityDoc.filename)}
                      alt="Identity Document"
                      className="h-28 w-full rounded-lg object-cover border"
                    />
                    <div className="absolute bottom-1 right-1 bg-black/60 text-white rounded px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
                      <Lock size={10} /> Secure
                    </div>
                  </div>
                )
              ) : (
                <div className="h-28 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-red-200 bg-red-50/50 p-2">
                  <span className="text-[11px] font-bold text-red-600">Document Not Uploaded</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs font-bold text-[var(--color-primary)] hover:underline"
              >
                {identityDoc ? 'Edit' : '+ Upload Now'}
              </button>
            </div>

            {/* Profile Photo */}
            <div className="rounded-[20px] border border-[var(--color-border)] p-4 text-center bg-white space-y-2">
              <p className="text-xs font-extrabold text-[var(--color-text)]">Profile Live Photo</p>
              {profilePhoto ? (
                <img
                  src={profilePhoto.preview || deliveryApplicationService.getDocumentUrl(profilePhoto.filename)}
                  alt="Profile Photo"
                  className="h-28 w-28 mx-auto rounded-full object-cover border"
                />
              ) : (
                <div className="h-28 w-28 mx-auto flex flex-col items-center justify-center rounded-full border-2 border-dashed border-red-200 bg-red-50/50 p-2">
                  <span className="text-[10px] font-bold text-red-600 text-center">Photo Not Uploaded</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="text-xs font-bold text-[var(--color-primary)] hover:underline"
              >
                {profilePhoto ? 'Edit' : '+ Take Photo'}
              </button>
            </div>
          </div>

          {!isWorkerComplete && (
            <div className="rounded-[20px] bg-red-50 border border-red-200 p-4 flex items-start gap-2.5 text-xs text-red-800">
              <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-red-900">Missing Required Verification Documents</p>
                <p>Please upload your identity document and live selfie photo before submitting your application.</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              type="button"
              disabled={submitting || !isWorkerComplete}
              onClick={handleSubmitApplication}
              className={`btn-primary px-8 inline-flex items-center gap-2 shadow-[var(--shadow-coral)] ${
                !isWorkerComplete ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="sm" /> Submitting...
                </>
              ) : (
                <>
                  Submit Application <CheckCircle2 size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Live Camera Viewfinder Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-[28px] bg-white p-5 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <p className="text-base font-extrabold text-[var(--color-text)] flex items-center gap-2">
                <Camera size={18} className="text-[var(--color-primary)]" />
                Capture {cameraTarget === 'selfie' ? 'Live Selfie' : 'Document'}
              </p>
              <button
                type="button"
                onClick={stopCamera}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative aspect-4/3 w-full overflow-hidden rounded-[20px] bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              {/* Overlay frame guide */}
              <div className="absolute inset-4 rounded-xl border-2 border-white/60 border-dashed pointer-events-none flex items-center justify-center">
                <p className="text-white/70 text-xs font-semibold px-3 py-1 bg-black/40 rounded-full">
                  Align {cameraTarget === 'selfie' ? 'your face' : 'document'} within this frame
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => startCamera(cameraTarget!, facingMode === 'user' ? 'environment' : 'user')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
              >
                <RefreshCw size={14} /> Switch Camera
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 shadow-[var(--shadow-coral)]"
              >
                <Camera size={16} /> Capture Now
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="text-xs font-bold text-gray-500 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
