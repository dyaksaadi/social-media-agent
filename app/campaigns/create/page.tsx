'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import insforge from '@/lib/insforge-client'

const ICON_OPTIONS = [
  { value: '🚀', label: 'Rocket' },
  { value: '💡', label: 'Lightbulb' },
  { value: '🎯', label: 'Target' },
  { value: '⭐', label: 'Star' },
  { value: '🔥', label: 'Fire' },
  { value: '💎', label: 'Diamond' },
  { value: '🎨', label: 'Art' },
  { value: '🌟', label: 'Shine' },
]

const OFFICE_IMAGES = [
  { id: 'modern', name: 'Modern Office', path: '/offices/modern-office.png' },
  { id: 'wooden', name: 'Wooden Office', path: '/offices/wooden-office.png' },
]

export default function CreateCampaignPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [campaignName, setCampaignName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('🚀')
  const [customIcon, setCustomIcon] = useState<File | null>(null)
  const [selectedOffice, setSelectedOffice] = useState('modern')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!user) {
    return null
  }

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setCustomIcon(e.target.files[0])
    }
  }

  const handleNext = () => {
    setError('')
    if (!campaignName.trim()) {
      setError('Campaign name is required')
      return
    }
    setStep(2)
  }

  const handleCreateCampaign = async () => {
    setLoading(true)
    setError('')

    try {
      // Get the selected office image path
      const officeImage = OFFICE_IMAGES.find(o => o.id === selectedOffice)?.path

      // Create campaign in database
      const { error: campaignError } = await insforge.database
        .from('campaigns')
        .insert([
          {
            user_id: user.id,
            name: campaignName,
            icon: selectedIcon,
            office_image: officeImage,
          },
        ])

      if (campaignError) {
        throw new Error(campaignError.message || 'Failed to create campaign')
      }

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">Create Your Campaign</h1>
          <p className="text-slate-300">Step {step} of 2</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 flex gap-2">
          <div className={`flex-1 h-1 rounded-full transition ${step >= 1 ? 'bg-blue-600' : 'bg-slate-700'}`}></div>
          <div className={`flex-1 h-1 rounded-full transition ${step >= 2 ? 'bg-blue-600' : 'bg-slate-700'}`}></div>
        </div>

        {/* Step 1: Campaign Name & Icon */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Campaign Details</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                {error}
              </div>
            )}

            {/* Campaign Name */}
            <div className="mb-8">
              <label htmlFor="campaign-name" className="block text-sm font-semibold text-slate-700 mb-3">
                Campaign Name
              </label>
              <input
                id="campaign-name"
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g., Summer Marketing 2026"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>

            {/* Icon Selection */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-slate-700 mb-4">Select Campaign Icon</label>
              <div className="grid grid-cols-4 gap-3 mb-6">
                {ICON_OPTIONS.map((icon) => (
                  <button
                    key={icon.value}
                    onClick={() => {
                      setSelectedIcon(icon.value)
                      setCustomIcon(null)
                    }}
                    className={`p-4 rounded-lg border-2 text-2xl transition ${
                      selectedIcon === icon.value && !customIcon
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    title={icon.label}
                  >
                    {icon.value}
                  </button>
                ))}
              </div>

              {/* Custom Icon Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Or upload custom icon</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleIconUpload}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600"
                />
                {customIcon && (
                  <p className="text-sm text-green-600 mt-2">✓ {customIcon.name} selected</p>
                )}
              </div>
            </div>

            {/* Next Button */}
            <button
              onClick={handleNext}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
            >
              Next
            </button>
          </div>
        )}

        {/* Step 2: Office Selection */}
        {step === 2 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Select Office Environment</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                {error}
              </div>
            )}

            {/* Office Images Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {OFFICE_IMAGES.map((office) => (
                <button
                  key={office.id}
                  onClick={() => setSelectedOffice(office.id)}
                  className={`relative overflow-hidden rounded-lg border-2 transition cursor-pointer ${
                    selectedOffice === office.id
                      ? 'border-blue-600 ring-2 ring-blue-300'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={office.path}
                    alt={office.name}
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                    <span className="text-white font-semibold">{office.name}</span>
                  </div>
                  {selectedOffice === office.id && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Campaign Summary */}
            <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3">Campaign Summary</h3>
              <div className="space-y-2 text-slate-700">
                <div className="flex justify-between">
                  <span>Campaign Name:</span>
                  <span className="font-semibold">{campaignName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Icon:</span>
                  <span className="text-2xl">{selectedIcon}</span>
                </div>
                <div className="flex justify-between">
                  <span>Office:</span>
                  <span className="font-semibold">{OFFICE_IMAGES.find(o => o.id === selectedOffice)?.name}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 font-semibold py-3 rounded-lg transition"
              >
                Back
              </button>
              <button
                onClick={handleCreateCampaign}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-3 rounded-lg transition"
              >
                {loading ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
