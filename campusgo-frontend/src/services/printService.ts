import api from './api'

export interface PrintJob {
  printJobId?: number
  id?: number
  originalFilename: string
  pageCount: number
  colorMode: 'BW' | 'COLOR'
  copies: number
  printingCost: number
  printStatus: string
  orderId?: number
  fileSizeBytes?: number
  createdAt?: string
}

export interface PrintSettings {
  bwPricePerPage: number
  colorPricePerPage: number
  maxFileSizeMB: number
}

export interface PrintQuote {
  pages: number
  colorMode: string
  copies: number
  printingCost: number
}

const printService = {
  /** Get configurable print prices from backend */
  async getSettings(): Promise<PrintSettings> {
    const res = await api.get<PrintSettings>('/api/print/settings')
    return res.data
  },

  /** Get a price quote for given parameters */
  async getQuote(pages: number, colorMode: string, copies: number): Promise<PrintQuote> {
    const res = await api.get<PrintQuote>('/api/print/quote', {
      params: { pages, colorMode, copies },
    })
    return res.data
  },

  /**
   * Upload a print document.
   * @param file       - the file to upload
   * @param colorMode  - 'BW' or 'COLOR'
   * @param copies     - number of copies
   * @param pageCount  - page count (0 if unknown before upload)
   */
  async uploadFile(
    file: File,
    colorMode: 'BW' | 'COLOR' = 'BW',
    copies: number = 1,
    pageCount: number = 0,
  ): Promise<PrintJob> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('colorMode', colorMode)
    formData.append('copies', String(copies))
    formData.append('pageCount', String(pageCount))

    const res = await api.post<PrintJob>('/api/print/upload', formData)
    return res.data
  },

  /** Update page count / copies / colorMode for an uploaded (not-yet-ordered) PrintJob */
  async updateJob(id: number, updates: Partial<Pick<PrintJob, 'pageCount' | 'copies' | 'colorMode'>>): Promise<PrintJob> {
    const res = await api.patch<PrintJob>(`/api/print/${id}`, updates)
    return res.data
  },

  /** Get student's own print jobs */
  async getMyJobs(): Promise<PrintJob[]> {
    const res = await api.get<PrintJob[]>('/api/print/my')
    return res.data
  },

  /** Manager: get print jobs, optionally filtered by status */
  async getManagerJobs(status?: string): Promise<PrintJob[]> {
    const res = await api.get<PrintJob[]>('/api/print/manager', {
      params: status ? { status } : {},
    })
    return res.data
  },

  /** Manager: update print job status */
  async updateStatus(id: number, status: string, managerNotes?: string): Promise<PrintJob> {
    const res = await api.post<PrintJob>(`/api/print/${id}/status`, {
      status,
      ...(managerNotes ? { managerNotes } : {}),
    })
    return res.data
  },

  /** Download file with auth headers */
  async downloadFile(id: number, filename: string): Promise<void> {
    const res = await api.get(`/api/print/${id}/download`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },

  /** Get the download URL for a print file (opens in browser / triggers download) */
  getDownloadUrl(id: number): string {
    return `${api.defaults.baseURL}/api/print/${id}/download`
  },

  /** Format file size for display */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  },

  /** Map printStatus to human-readable label */
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      UPLOADED:  'Uploaded',
      PENDING:   'Submitted',
      ACCEPTED:  'Accepted',
      PRINTING:  'Printing…',
      READY:     'Ready for Pickup',
      COLLECTED: 'Collected',
      REJECTED:  'Rejected',
    }
    return labels[status] ?? status
  },
}

export default printService
