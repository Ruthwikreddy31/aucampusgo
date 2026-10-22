import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import printService, { type PrintJob, type PrintSettings } from '../../services/printService'
import { useAuthStore } from '../../store/authStore'

// ─── Types ────────────────────────────────────────────────────────────────────

type ColorMode = 'BW' | 'COLOR'

type Step = 'upload' | 'configure' | 'summary'

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png']
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'pdf':  return '📄'
    case 'doc': case 'docx': return '📝'
    case 'ppt': case 'pptx': return '📊'
    case 'jpg': case 'jpeg': case 'png': return '🖼️'
    default: return '📁'
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrintPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State
  const [step, setStep]             = useState<Step>('upload')
  const [file, setFile]             = useState<File | null>(null)
  const [dragging, setDragging]     = useState(false)
  const [colorMode, setColorMode]   = useState<ColorMode>('BW')
  const [copies, setCopies]         = useState(1)
  const [pageCount, setPageCount]   = useState(0)
  const [settings, setSettings]     = useState<PrintSettings | null>(null)
  const [printJob, setPrintJob]     = useState<PrintJob | null>(null)
  const [uploading, setUploading]   = useState(false)

  // Computed
  const pricePerPage = settings
    ? (colorMode === 'COLOR' ? settings.colorPricePerPage : settings.bwPricePerPage)
    : (colorMode === 'COLOR' ? 5 : 2)

  const printingCost = pageCount > 0 ? pricePerPage * pageCount * copies : 0
  const platformFee  = 5
  const deliveryFee  = 15
  const total        = printingCost + platformFee + deliveryFee

  // ─── Fetch settings ─────────────────────────────────────────────────────────

  useEffect(() => {
    printService.getSettings()
      .then(setSettings)
      .catch(() => { /* fallback to defaults */ })
  }, [])

  // ─── File handling ───────────────────────────────────────────────────────────

  const validateFile = useCallback((f: File): string | null => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_TYPES.includes(f.type)) {
      return `File type not supported. Allowed: PDF, DOC, DOCX, PPT, PPTX, JPG, PNG.`
    }
    const maxMB = settings?.maxFileSizeMB ?? 20
    if (f.size > maxMB * 1024 * 1024) {
      return `File size exceeds ${maxMB} MB limit.`
    }
    return null
  }, [settings])

  const handleFileSelect = useCallback((f: File) => {
    const error = validateFile(f)
    if (error) { toast.error(error); return }
    setFile(f)
    setStep('configure')
  }, [validateFile])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFileSelect(f)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }

  // ─── Upload ──────────────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!file) return
    if (!user) { toast.error('Please sign in to use the Print Service.'); navigate('/login'); return }
    if (pageCount < 1) { toast.error('Please enter the number of pages in your document.'); return }

    setUploading(true)
    try {
      const job = await printService.uploadFile(file, colorMode, copies, pageCount)
      setPrintJob(job)
      setStep('summary')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // ─── Update job if user changes copies / colorMode on summary ────────────────

  const handleUpdateJob = async (field: 'copies' | 'colorMode', value: number | string) => {
    if (!printJob?.printJobId) return
    const updates = field === 'copies'
      ? { copies: value as number, pageCount }
      : { colorMode: value as ColorMode, pageCount }

    try {
      const updated = await printService.updateJob(printJob.printJobId, updates)
      setPrintJob(prev => prev ? { ...prev, ...updated } : prev)
    } catch {
      // Non-critical; UI already has optimistic state
    }
  }

  // ─── Checkout ─────────────────────────────────────────────────────────────────

  const handleGoToCheckout = () => {
    if (!printJob?.printJobId) { toast.error('Please complete the upload first.'); return }
    // Store print job info in sessionStorage so CheckoutPage can read it
    sessionStorage.setItem('campusgo_print_job', JSON.stringify({
      printJobId:       printJob.printJobId,
      originalFilename: printJob.originalFilename,
      pageCount:        printJob.pageCount ?? pageCount,
      colorMode:        printJob.colorMode ?? colorMode,
      copies:           printJob.copies ?? copies,
      printingCost:     printJob.printingCost ?? printingCost,
    }))
    navigate('/checkout?mode=print')
  }

  // ─── Render helpers ───────────────────────────────────────────────────────────

  const renderStepIndicator = () => (
    <div className="print-steps">
      {(['upload', 'configure', 'summary'] as Step[]).map((s, i) => (
        <div key={s} className={`print-step ${step === s ? 'active' : step === 'summary' && s !== 'summary' ? 'done' : step === 'configure' && s === 'upload' ? 'done' : ''}`}>
          <div className="step-dot">{step !== s && ((s === 'upload' && (step === 'configure' || step === 'summary')) || (s === 'configure' && step === 'summary')) ? '✓' : i + 1}</div>
          <span>{s === 'upload' ? 'Upload File' : s === 'configure' ? 'Configure' : 'Review & Order'}</span>
        </div>
      ))}
    </div>
  )

  // ─── Step 1: Upload ───────────────────────────────────────────────────────────

  const renderUpload = () => (
    <div className="print-card">
      <div className="print-card-header">
        <span className="print-icon">🖨️</span>
        <div>
          <h2>Print Document</h2>
          <p>Upload your file and we'll have it printed and delivered to you</p>
        </div>
      </div>

      <div
        id="print-dropzone"
        className={`print-dropzone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        aria-label="Upload file dropzone"
      >
        <input
          ref={fileInputRef}
          type="file"
          id="print-file-input"
          hidden
          accept={ALLOWED_EXTENSIONS.join(',')}
          onChange={onInputChange}
        />
        <div className="dropzone-content">
          <div className="dropzone-icon">📤</div>
          <p className="dropzone-title">Click to browse or drag & drop your file here</p>
          <p className="dropzone-subtitle">PDF, DOC, DOCX, PPT, PPTX, JPG, PNG</p>
          <p className="dropzone-limit">Maximum {settings?.maxFileSizeMB ?? 20} MB</p>
        </div>
      </div>

      <div className="print-formats">
        {['PDF', 'DOC', 'DOCX', 'PPT', 'PPTX', 'JPG', 'PNG'].map(fmt => (
          <span key={fmt} className="format-chip">{fmt}</span>
        ))}
      </div>
    </div>
  )

  // ─── Step 2: Configure ────────────────────────────────────────────────────────

  const renderConfigure = () => (
    <div className="print-card">
      <div className="print-card-header">
        <span className="print-icon">⚙️</span>
        <div>
          <h2>Configure Print</h2>
          <p>Set your print preferences</p>
        </div>
      </div>

      {/* File info */}
      {file && (
        <div className="file-info-box">
          <span className="file-icon-lg">{getFileIcon(file.name)}</span>
          <div className="file-meta">
            <p className="file-name">{file.name}</p>
            <p className="file-size">{formatSize(file.size)}</p>
          </div>
          <button
            className="btn-ghost-sm"
            onClick={() => { setFile(null); setStep('upload'); setPrintJob(null) }}
          >
            Change
          </button>
        </div>
      )}

      {/* Page count */}
      <div className="form-group">
        <label htmlFor="page-count">Number of Pages in Document</label>
        <div className="copies-control">
          <button
            id="page-count-minus"
            className="copies-btn"
            onClick={() => setPageCount(p => Math.max(1, p - 1))}
            disabled={pageCount <= 1}
          >−</button>
          <input
            id="page-count"
            type="number"
            className="copies-input"
            value={pageCount || ''}
            min={1}
            onChange={(e) => {
              const v = parseInt(e.target.value)
              if (!isNaN(v) && v >= 1) setPageCount(v)
            }}
            placeholder="0"
          />
          <button
            id="page-count-plus"
            className="copies-btn"
            onClick={() => setPageCount(p => p + 1)}
          >+</button>
        </div>
        <p className="field-hint">Enter the exact page count of your document</p>
      </div>

      {/* Color mode */}
      <div className="form-group">
        <label>Print Type</label>
        <div className="color-mode-options">
          <button
            id="print-bw"
            className={`color-mode-btn ${colorMode === 'BW' ? 'selected' : ''}`}
            onClick={() => setColorMode('BW')}
          >
            <span className="mode-icon">⚫</span>
            <div>
              <p className="mode-title">Black & White</p>
              <p className="mode-price">₹{settings?.bwPricePerPage ?? 2}/page</p>
            </div>
            {colorMode === 'BW' && <span className="mode-check">✓</span>}
          </button>
          <button
            id="print-color"
            className={`color-mode-btn ${colorMode === 'COLOR' ? 'selected' : ''}`}
            onClick={() => setColorMode('COLOR')}
          >
            <span className="mode-icon">🎨</span>
            <div>
              <p className="mode-title">Color</p>
              <p className="mode-price">₹{settings?.colorPricePerPage ?? 5}/page</p>
            </div>
            {colorMode === 'COLOR' && <span className="mode-check">✓</span>}
          </button>
        </div>
      </div>

      {/* Copies */}
      <div className="form-group">
        <label>Number of Copies</label>
        <div className="copies-control">
          <button
            id="copies-minus"
            className="copies-btn"
            onClick={() => setCopies(c => Math.max(1, c - 1))}
            disabled={copies <= 1}
          >−</button>
          <span id="copies-display" className="copies-display">{copies}</span>
          <button
            id="copies-plus"
            className="copies-btn"
            onClick={() => setCopies(c => Math.min(50, c + 1))}
          >+</button>
        </div>
      </div>

      {/* Live estimate */}
      {pageCount > 0 && (
        <div className="cost-estimate">
          <div className="estimate-row">
            <span>{pageCount} pages × ₹{pricePerPage} ({colorMode === 'BW' ? 'B&W' : 'Color'}) × {copies} {copies === 1 ? 'copy' : 'copies'}</span>
            <span>₹{printingCost.toFixed(2)}</span>
          </div>
          <div className="estimate-row muted">
            <span>Delivery Fee</span>
            <span>₹{deliveryFee}</span>
          </div>
          <div className="estimate-row muted">
            <span>Platform Fee</span>
            <span>₹{platformFee}</span>
          </div>
          <div className="estimate-total">
            <span>Estimated Total</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
        </div>
      )}

      <div className="print-actions">
        <button className="btn-outline" onClick={() => setStep('upload')}>Back</button>
        <button
          id="print-upload-btn"
          className="btn-primary"
          onClick={handleUpload}
          disabled={uploading || !file || pageCount < 1}
        >
          {uploading ? (
            <><span className="spinner-sm" /> Uploading…</>
          ) : 'Upload & Preview'}
        </button>
      </div>
    </div>
  )

  // ─── Step 3: Summary ──────────────────────────────────────────────────────────

  const renderSummary = () => {
    const job = printJob
    if (!job) return null
    const jobPages    = job.pageCount  ?? pageCount
    const jobColorMode = job.colorMode ?? colorMode
    const jobCopies   = job.copies     ?? copies
    const jobCost     = typeof job.printingCost === 'number' ? job.printingCost : printingCost

    return (
      <div className="print-card">
        <div className="print-card-header">
          <span className="print-icon">📋</span>
          <div>
            <h2>Print Order Summary</h2>
            <p>Review your print details before placing the order</p>
          </div>
        </div>

        <div className="summary-grid">
          <div className="summary-row">
            <span className="summary-label">File</span>
            <span className="summary-value file-chip">
              {getFileIcon(job.originalFilename)} {job.originalFilename}
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Pages</span>
            <span className="summary-value">{jobPages}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Print Type</span>
            <span className={`summary-value badge ${jobColorMode === 'COLOR' ? 'badge-color' : 'badge-bw'}`}>
              {jobColorMode === 'COLOR' ? '🎨 Color' : '⚫ Black & White'}
            </span>
          </div>

          {/* Copies – editable */}
          <div className="summary-row">
            <span className="summary-label">Copies</span>
            <div className="copies-control copies-sm">
              <button
                className="copies-btn"
                onClick={() => {
                  const v = Math.max(1, (printJob?.copies ?? 1) - 1)
                  setPrintJob(p => p ? { ...p, copies: v } : p)
                  handleUpdateJob('copies', v)
                }}
              >−</button>
              <span className="copies-display">{job.copies ?? 1}</span>
              <button
                className="copies-btn"
                onClick={() => {
                  const v = Math.min(50, (printJob?.copies ?? 1) + 1)
                  setPrintJob(p => p ? { ...p, copies: v } : p)
                  handleUpdateJob('copies', v)
                }}
              >+</button>
            </div>
          </div>
        </div>

        {/* Billing breakdown */}
        <div className="order-summary-box">
          <div className="summary-line">
            <span>Printing Cost ({jobPages} pg × ₹{pricePerPage} × {jobCopies})</span>
            <span>₹{jobCost.toFixed(2)}</span>
          </div>
          <div className="summary-line muted">
            <span>Delivery Fee</span>
            <span>₹{deliveryFee}.00</span>
          </div>
          <div className="summary-line muted">
            <span>Platform Fee</span>
            <span>₹{platformFee}.00</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-line total">
            <span>TOTAL</span>
            <span>₹{(jobCost + deliveryFee + platformFee).toFixed(2)}</span>
          </div>
        </div>

        <div className="info-banner">
          <span>ℹ️</span>
          <p>Your document will be securely sent to the <strong>Readers</strong> shop manager for printing, then delivered to your chosen location.</p>
        </div>

        <div className="print-actions">
          <button className="btn-outline" onClick={() => setStep('configure')}>Back</button>
          <button
            id="print-checkout-btn"
            className="btn-primary"
            onClick={handleGoToCheckout}
          >
            📦 Proceed to Checkout
          </button>
        </div>
      </div>
    )
  }

  // ─── Main render ──────────────────────────────────────────────────────────────

  return (
    <div className="print-page">
      <style>{`
        .print-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
          padding: 2rem 1rem 4rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          font-family: 'Inter', sans-serif;
        }

        .print-page-title {
          text-align: center;
          color: #fff;
        }

        .print-page-title h1 {
          font-size: 2rem;
          font-weight: 800;
          background: linear-gradient(90deg, #a78bfa, #60a5fa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 0.25rem;
        }

        .print-page-title p {
          color: rgba(255,255,255,0.6);
          font-size: 0.95rem;
          margin: 0;
        }

        /* Steps */
        .print-steps {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .print-step {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: rgba(255,255,255,0.4);
          font-size: 0.85rem;
          font-weight: 500;
        }

        .print-step.active { color: #a78bfa; }
        .print-step.done   { color: #34d399; }

        .step-dot {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 700;
          flex-shrink: 0;
        }

        .print-step.active .step-dot { background: #7c3aed; color: #fff; }
        .print-step.done   .step-dot { background: #059669; color: #fff; }

        .print-steps .print-step + .print-step::before {
          content: '';
          display: block;
          width: 2rem;
          height: 2px;
          background: rgba(255,255,255,0.15);
          margin-right: 0.5rem;
        }

        /* Card */
        .print-card {
          width: 100%;
          max-width: 580px;
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 20px;
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          box-shadow: 0 24px 60px rgba(0,0,0,0.4);
        }

        .print-card-header {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .print-icon { font-size: 2rem; }

        .print-card-header h2 {
          margin: 0 0 0.2rem;
          color: #fff;
          font-size: 1.25rem;
          font-weight: 700;
        }

        .print-card-header p {
          margin: 0;
          color: rgba(255,255,255,0.5);
          font-size: 0.85rem;
        }

        /* Dropzone */
        .print-dropzone {
          border: 2px dashed rgba(167,139,250,0.4);
          border-radius: 16px;
          padding: 2.5rem 1.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          background: rgba(167,139,250,0.05);
          text-align: center;
          outline: none;
        }

        .print-dropzone:hover, .print-dropzone.dragging {
          border-color: #7c3aed;
          background: rgba(124,58,237,0.1);
          transform: scale(1.01);
        }

        .dropzone-content { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
        .dropzone-icon { font-size: 2.5rem; }
        .dropzone-title { color: #fff; font-weight: 600; font-size: 1rem; margin: 0; }
        .dropzone-subtitle { color: rgba(255,255,255,0.5); font-size: 0.8rem; margin: 0; }
        .dropzone-limit { color: rgba(255,255,255,0.35); font-size: 0.75rem; margin: 0; }

        .print-formats {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          justify-content: center;
        }

        .format-chip {
          background: rgba(167,139,250,0.15);
          border: 1px solid rgba(167,139,250,0.3);
          color: #a78bfa;
          padding: 0.2rem 0.6rem;
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        /* File info */
        .file-info-box {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 0.85rem 1rem;
        }

        .file-icon-lg { font-size: 1.75rem; flex-shrink: 0; }
        .file-meta { flex: 1; min-width: 0; }
        .file-name { margin: 0; color: #fff; font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .file-size { margin: 0; color: rgba(255,255,255,0.45); font-size: 0.8rem; }

        /* Form */
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }

        .form-group label {
          color: rgba(255,255,255,0.8);
          font-size: 0.85rem;
          font-weight: 600;
        }

        .field-hint {
          color: rgba(255,255,255,0.35);
          font-size: 0.75rem;
          margin: 0;
        }

        /* Copies control */
        .copies-control {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: fit-content;
        }

        .copies-sm { transform: scale(0.9); transform-origin: left; }

        .copies-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: #fff;
          font-size: 1.2rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
          flex-shrink: 0;
        }

        .copies-btn:hover:not(:disabled) { background: rgba(124,58,237,0.4); }
        .copies-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .copies-display {
          min-width: 2rem;
          text-align: center;
          color: #fff;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .copies-input {
          width: 60px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          color: #fff;
          text-align: center;
          padding: 0.35rem;
          font-size: 1rem;
          font-weight: 700;
          outline: none;
        }

        /* Color mode */
        .color-mode-options { display: flex; gap: 0.75rem; flex-wrap: wrap; }

        .color-mode-btn {
          flex: 1;
          min-width: 140px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.85rem 1rem;
          background: rgba(255,255,255,0.06);
          border: 2px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          color: inherit;
          text-align: left;
          position: relative;
        }

        .color-mode-btn.selected {
          border-color: #7c3aed;
          background: rgba(124,58,237,0.15);
        }

        .mode-icon { font-size: 1.4rem; flex-shrink: 0; }
        .mode-title { margin: 0; color: #fff; font-weight: 600; font-size: 0.9rem; }
        .mode-price { margin: 0; color: rgba(255,255,255,0.5); font-size: 0.78rem; }
        .mode-check { position: absolute; right: 0.75rem; color: #7c3aed; font-size: 1.1rem; font-weight: 700; }

        /* Cost estimate */
        .cost-estimate {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .estimate-row {
          display: flex;
          justify-content: space-between;
          color: #fff;
          font-size: 0.85rem;
        }

        .estimate-row.muted { color: rgba(255,255,255,0.5); }

        .estimate-total {
          display: flex;
          justify-content: space-between;
          color: #a78bfa;
          font-weight: 700;
          font-size: 1rem;
          border-top: 1px solid rgba(255,255,255,0.1);
          padding-top: 0.5rem;
          margin-top: 0.25rem;
        }

        /* Summary grid */
        .summary-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .summary-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .summary-label {
          color: rgba(255,255,255,0.5);
          font-size: 0.85rem;
          min-width: 80px;
        }

        .summary-value {
          color: #fff;
          font-weight: 600;
          font-size: 0.9rem;
          text-align: right;
        }

        .file-chip {
          background: rgba(255,255,255,0.07);
          padding: 0.2rem 0.6rem;
          border-radius: 8px;
          font-size: 0.82rem;
          max-width: 220px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.2rem 0.6rem;
          border-radius: 100px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .badge-bw {
          background: rgba(255,255,255,0.1);
          color: #fff;
        }

        .badge-color {
          background: rgba(251,191,36,0.15);
          color: #fbbf24;
          border: 1px solid rgba(251,191,36,0.3);
        }

        /* Order summary */
        .order-summary-box {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 1.1rem;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .summary-line {
          display: flex;
          justify-content: space-between;
          color: #fff;
          font-size: 0.88rem;
        }

        .summary-line.muted { color: rgba(255,255,255,0.5); }

        .summary-line.total {
          font-size: 1.05rem;
          font-weight: 700;
          color: #a78bfa;
        }

        .summary-divider {
          height: 1px;
          background: rgba(255,255,255,0.1);
          margin: 0.25rem 0;
        }

        /* Info banner */
        .info-banner {
          display: flex;
          gap: 0.6rem;
          align-items: flex-start;
          background: rgba(96,165,250,0.1);
          border: 1px solid rgba(96,165,250,0.25);
          border-radius: 10px;
          padding: 0.85rem;
          font-size: 0.82rem;
          color: rgba(255,255,255,0.7);
          line-height: 1.5;
        }

        .info-banner strong { color: #60a5fa; }

        /* Buttons */
        .print-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.7rem 1.5rem;
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 16px rgba(124,58,237,0.4);
        }

        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #6d28d9, #5b21b6);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(124,58,237,0.5);
        }

        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .btn-outline {
          padding: 0.7rem 1.2rem;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 10px;
          color: rgba(255,255,255,0.7);
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-outline:hover { border-color: rgba(255,255,255,0.5); color: #fff; background: rgba(255,255,255,0.05); }

        .btn-ghost-sm {
          padding: 0.35rem 0.75rem;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          color: rgba(255,255,255,0.6);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        .btn-ghost-sm:hover { color: #fff; border-color: rgba(255,255,255,0.4); }

        .spinner-sm {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="print-page-title">
        <h1>🖨️ Print Service</h1>
        <p>Available through Readers — upload, configure, and order prints</p>
      </div>

      {renderStepIndicator()}

      {step === 'upload'     && renderUpload()}
      {step === 'configure'  && renderConfigure()}
      {step === 'summary'    && renderSummary()}
    </div>
  )
}
