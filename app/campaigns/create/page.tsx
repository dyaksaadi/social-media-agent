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
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [selectedOffice, setSelectedOffice] = useState('modern')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!user) {
    return null
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Logo must be less than 5MB')
        return
      }

      setLogoFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
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
      let logoUrl = null

      // Upload logo ke storage jika ada
      if (logoFile) {
        const fileName = `${user.id}/${Date.now()}-${logoFile.name}`
        const { error: uploadError, data: uploadData } = await insforge.storage
          .from('campaign-logos')
          .upload(fileName, logoFile)

        if (uploadError) {
          throw new Error(`Logo upload failed: ${uploadError.message}`)
        }

        // Get public URL
        if (uploadData?.key) {
          logoUrl = `${process.env.NEXT_PUBLIC_INSFORGE_URL}/storage/v1/object/public/campaign-logos/${uploadData.key}`
        }
      }

      const officeImage = OFFICE_IMAGES.find(o => o.id === selectedOffice)?.path

      const { error: campaignError } = await insforge.database
        .from('campaigns')
        .insert([
          {
            user_id: user.id,
            name: campaignName,
            icon: selectedIcon,
            office_image: officeImage,
            logo: logoUrl,
          },
        ])

      if (campaignError) {
        throw new Error(campaignError.message || 'Failed to create campaign')
      }

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Step 1: Campaign Name & Icon */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 text-blue-600 font-bold mb-4">
                01
              </div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Create Your Campaign</h1>
              <p className="text-slate-600">Let's start by naming your campaign and choosing an icon</p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            {/* Main Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Campaign Name Card */}
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-lg transition">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    ①
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">Campaign Name</h2>
                </div>

                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g., Summer Marketing"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder:text-slate-400"
                />
              </div>

              {/* Icon Selection Card */}
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-lg transition">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    ②
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">Select Icon</h2>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon.value}
                      onClick={() => setSelectedIcon(icon.value)}
                      className={`p-3 rounded-xl border-2 text-2xl font-semibold transition ${
                        selectedIcon === icon.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      title={icon.label}
                    >
                      {icon.value}
                    </button>
                  ))}
                </div>
              </div>

              {/* Logo Upload Card */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-lg transition">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    ③
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">Campaign Logo</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Upload Area */}
                  <div>
                    <label className="block mb-3">
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <div className="text-4xl mb-2">📸</div>
                        <p className="text-sm font-medium text-slate-900">Click to upload logo</p>
                        <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 5MB</p>
                      </div>
                    </label>
                  </div>

                  {/* Preview */}
                  <div>
                    {logoPreview ? (
                      <div className="bg-slate-50 rounded-xl p-6 flex flex-col items-center justify-center h-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-24 h-24 object-contain mb-3 rounded-lg"
                        />
                        <p className="text-sm font-medium text-slate-900">{logoFile?.name}</p>
                        <button
                          onClick={() => {
                            setLogoFile(null)
                            setLogoPreview('')
                          }}
                          className="mt-3 text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="bg-slate-50 rounded-xl p-6 flex items-center justify-center h-full">
                        <p className="text-sm text-slate-500">Logo preview will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Card */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 shadow-lg text-white">
              <p className="text-blue-100 text-sm mb-2">Campaign Preview</p>
              <div className="flex items-center gap-4">
                <div className="text-6xl">{selectedIcon}</div>
                <div>
                  <h3 className="text-2xl font-bold">{campaignName || 'Your Campaign Name'}</h3>
                  <p className="text-blue-100 text-sm mt-1">Ready to launch your campaign</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 px-6 py-3 rounded-xl border-2 border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleNext}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:shadow-lg transition"
              >
                Next Step →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Office Selection */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 text-blue-600 font-bold mb-4">
                02
              </div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Choose Your Office</h1>
              <p className="text-slate-600">Select the environment for your AI agent office</p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            {/* Office Selection Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {OFFICE_IMAGES.map((office) => (
                <button
                  key={office.id}
                  onClick={() => setSelectedOffice(office.id)}
                  className={`relative overflow-hidden rounded-2xl border-2 transition group cursor-pointer ${
                    selectedOffice === office.id
                      ? 'border-blue-600 ring-2 ring-blue-300'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={office.path}
                    alt={office.name}
                    className="w-full h-64 object-cover group-hover:scale-105 transition"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                    <div className="text-left">
                      <h3 className="text-white font-bold text-lg">{office.name}</h3>
                      <p className="text-blue-100 text-sm">Perfect for AI campaigns</p>
                    </div>
                  </div>
                  {selectedOffice === office.id && (
                    <div className="absolute top-4 right-4 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center ring-4 ring-white">
                      <span className="text-white text-sm font-bold">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Summary Card */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 text-sm">✓</div>
                Campaign Summary
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <span className="text-slate-600 font-medium">Campaign</span>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{selectedIcon}</span>
                    <span className="text-slate-900 font-semibold">{campaignName}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <span className="text-slate-600 font-medium">Office</span>
                  <span className="text-slate-900 font-semibold">{OFFICE_IMAGES.find(o => o.id === selectedOffice)?.name}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-6 py-3 rounded-xl border-2 border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition"
              >
                ← Back
              </button>
              <button
                onClick={handleCreateCampaign}
                disabled={loading}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:shadow-lg disabled:opacity-50 transition"
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
