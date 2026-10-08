import { useEffect, useState } from 'react'
import {
  Save,
  IndianRupee,
  Navigation,
  Timer,
  Zap,
} from 'lucide-react'
import { adminService } from '../../services/adminService'
import LoadingSpinner from '../../components/LoadingSpinner'
import { toast } from 'sonner'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    adminService.getSettings()
      .then(setSettings)
      .catch((err) => console.error('Failed to load settings:', err))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await adminService.updateSettings(settings)
      setSettings(updated)
      toast.success('Campus settings updated and synchronized successfully.')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" message="Loading campus configuration..." />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-[fadeSlideIn_0.2s_ease] max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white sm:text-3xl">Campus Environment Settings</h1>
        <p className="text-xs font-medium text-slate-400 mt-1">
          Configure physical delivery radius, geofence constraints, fee architecture, and campus operating parameters.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Geofence and Boundaries */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <Navigation size={18} className="text-indigo-400" />
            <h2 className="font-extrabold text-white text-base">Campus Boundary & Geofence Coordinates</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Campus Facility Name
              </label>
              <input
                type="text"
                value={settings['campus.name'] || 'Anurag University Hyderabad'}
                onChange={(e) => handleChange('campus.name', e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Delivery Geofence Radius (Meters)
              </label>
              <input
                type="number"
                value={settings['delivery.radius.meters'] || '15000'}
                onChange={(e) => handleChange('delivery.radius.meters', e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Center Latitude
              </label>
              <input
                type="text"
                value={settings['campus.latitude'] || '17.4018'}
                onChange={(e) => handleChange('campus.latitude', e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Center Longitude
              </label>
              <input
                type="text"
                value={settings['campus.longitude'] || '78.5602'}
                onChange={(e) => handleChange('campus.longitude', e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Pricing and Orders */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <IndianRupee size={18} className="text-emerald-400" />
            <h2 className="font-extrabold text-white text-base">Campus Delivery Fee & Cart Rules</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Flat Campus Delivery Fee (₹)
              </label>
              <input
                type="number"
                value={settings['delivery.flat.fee'] || '15'}
                onChange={(e) => handleChange('delivery.flat.fee', e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Minimum Cart Order (₹)
              </label>
              <input
                type="number"
                value={settings['order.minimum.amount'] || '30'}
                onChange={(e) => handleChange('order.minimum.amount', e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Platform Operating Hours
              </label>
              <input
                type="text"
                value={settings['campus.operating.hours'] || '08:00 - 21:00'}
                onChange={(e) => handleChange('campus.operating.hours', e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Maintenance Mode
              </label>
              <select
                value={settings['system.maintenance.mode'] || 'false'}
                onChange={(e) => handleChange('system.maintenance.mode', e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
              >
                <option value="false">Live & Operational (Normal)</option>
                <option value="true">Active Maintenance (Pause Ordering)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ZestModel Configuration */}
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-amber-500/20">
            <Zap size={18} className="text-amber-400" />
            <h2 className="font-extrabold text-white text-base">ZestModel Bidding Engine</h2>
            <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-widest">Live</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Configure the real-time bidding engine used by ZestModel orders. Partners bid on delivery fee within the allowed window.
            Customers then select their preferred partner — the system <strong className="text-white">never auto-assigns</strong>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                <span className="flex items-center gap-1"><Timer size={12} /> Default Bid Window (minutes)</span>
              </label>
              <input
                type="number"
                value={settings['zest.bid.window.minutes'] || '5'}
                onChange={(e) => handleChange('zest.bid.window.minutes', e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                min={1} max={30}
              />
              <p className="text-[10px] text-slate-500 mt-1">Time partners have to submit bids after order is placed.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Minimum Allowed Bid (₹)
              </label>
              <input
                type="number"
                value={settings['zest.bid.min.fee'] || '10'}
                onChange={(e) => handleChange('zest.bid.min.fee', e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                min={5}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Maximum Allowed Bid Cap (₹)
              </label>
              <input
                type="number"
                value={settings['zest.bid.max.fee'] || '100'}
                onChange={(e) => handleChange('zest.bid.max.fee', e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                min={20}
              />
              <p className="text-[10px] text-slate-500 mt-1">Bids above this amount will be rejected by the system.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Partner Daily Participation Fee (₹)
              </label>
              <input
                type="number"
                value={settings['zest.partner.daily.fee'] || '10'}
                onChange={(e) => handleChange('zest.partner.daily.fee', e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                min={0}
              />
              <p className="text-[10px] text-slate-500 mt-1">Kept separate from delivery earnings. Paid once per calendar day.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Deadline Window Options
              </label>
              <input
                type="text"
                value={settings['zest.deadline.options.minutes'] || '15,30,45,60'}
                onChange={(e) => handleChange('zest.deadline.options.minutes', e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                placeholder="15,30,45,60"
              />
              <p className="text-[10px] text-slate-500 mt-1">Comma-separated list of deadline choices shown to customers (minutes).</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                ZestModel Enabled
              </label>
              <select
                value={settings['zest.enabled'] || 'true'}
                onChange={(e) => handleChange('zest.enabled', e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-amber-500"
              >
                <option value="true">Enabled (Accept ZestModel orders)</option>
                <option value="false">Disabled (Standard delivery only)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-xs font-extrabold text-white shadow-lg shadow-indigo-600/20 hover:from-violet-500 hover:to-indigo-500 transition disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Campus Configurations'}
          </button>
        </div>
      </form>
    </div>
  )
}
