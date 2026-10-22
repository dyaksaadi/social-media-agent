'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import insforge from '@/lib/insforge-client'

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: '📷', color: 'from-pink-500 to-rose-500', charLimit: 2200 },
  { id: 'twitter', name: 'Twitter/X', icon: '𝕏', color: 'from-slate-900 to-slate-800', charLimit: 280 },
  { id: 'facebook', name: 'Facebook', icon: 'f', color: 'from-blue-600 to-blue-700', charLimit: 63206 },
  { id: 'linkedin', name: 'LinkedIn', icon: 'in', color: 'from-blue-700 to-blue-800', charLimit: 3000 },
  { id: 'tiktok', name: 'TikTok', icon: '♪', color: 'from-black to-slate-900', charLimit: 2200 },
]

export default function CreateMessagePage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const campaignId = params?.campaignId as string

  const [campaign, setCampaign] = useState<any>(null)
  const [content, setContent] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram', 'twitter'])
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreview, setMediaPreview] = useState<string[]>([])
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [showAiSuggestion, setShowAiSuggestion] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const fetchCampaign = async () => {
      if (!campaignId || !user) return

      try {
        const { data } = await insforge.database
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .eq('user_id', user.id)
          .single()

        setCampaign(data)
      } catch (err) {
        console.error('Campaign not found:', err)
        router.push('/dashboard')
      }
    }

    fetchCampaign()
  }, [campaignId, user, router])

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    if (mediaFiles.length + files.length > 5) {
      setError('Maximum 5 media files allowed')
      return
    }

    files.forEach(file => {
      if (file.size > 50 * 1024 * 1024) {
        setError('Each file must be less than 50MB')
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        setMediaPreview(prev => [...prev, event.target?.result as string])
      }
      reader.readAsDataURL(file)
    })

    setMediaFiles(prev => [...prev, ...files])
  }

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
    setMediaPreview(prev => prev.filter((_, i) => i !== index))
  }

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const getCharLimit = () => {
    if (selectedPlatforms.length === 1) {
      return PLATFORMS.find(p => p.id === selectedPlatforms[0])?.charLimit || 280
    }
    return Math.min(...selectedPlatforms.map(p => PLATFORMS.find(pl => pl.id === p)?.charLimit || 280))
  }

  const charLimit = getCharLimit()
  const charCount = content.length
  const charWarning = charCount > charLimit * 0.8

  const generateAiSuggestion = () => {
    // Placeholder AI suggestion - in production, call OpenRouter AI
    const suggestions = [
      `🚀 Check this out! ${campaign?.name} is here to transform your social media. Don't miss out! #AI #Social`,
      `✨ Introducing ${campaign?.name} - Your new favorite social media companion. Join thousands of happy users! 🎯`,
      `💡 Ready to level up? ${campaign?.name} makes creating content easier than ever. Try it free today! 🔥`,
    ]
    const random = suggestions[Math.floor(Math.random() * suggestions.length)]
    setAiSuggestion(random)
    setShowAiSuggestion(true)
  }

  const applyAiSuggestion = () => {
    setContent(aiSuggestion)
    setShowAiSuggestion(false)
  }

  const handlePublish = async (status: 'draft' | 'scheduled' | 'posted') => {
    setLoading(true)
    setError('')

    try {
      if (!content.trim()) {
        setError('Message content is required')
        setLoading(false)
        return
      }

      if (selectedPlatforms.length === 0) {
        setError('Select at least one platform')
        setLoading(false)
        return
      }

      let mediaUrls: string[] = []

      // Upload media files
      if (mediaFiles.length > 0) {
        for (const file of mediaFiles) {
          const fileName = `${campaignId}/${Date.now()}-${file.name}`
          const { error: uploadError, data: uploadData } = await insforge.storage
            .from('campaign-messages')
            .upload(fileName, file)

          if (uploadError) throw uploadError

          if (uploadData?.key) {
            mediaUrls.push(
              `${process.env.NEXT_PUBLIC_INSFORGE_URL}/storage/v1/object/public/campaign-messages/${uploadData.key}`
            )
          }
        }
      }

      let scheduledAt = null
      if (status === 'scheduled' && scheduledDate && scheduledTime) {
        scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      }

      const { error: messageError } = await insforge.database
        .from('messages')
        .insert([
          {
            campaign_id: campaignId,
            user_id: user?.id,
            content,
            media_urls: mediaUrls,
            platforms: selectedPlatforms,
            scheduled_at: scheduledAt,
            status: status === 'posted' ? 'posted' : status,
            posted_at: status === 'posted' ? new Date().toISOString() : null,
            character_count: charCount,
            ai_suggestion: aiSuggestion || null,
          },
        ])

      if (messageError) throw messageError

      setSuccess(true)
      setTimeout(() => {
        router.push(`/campaigns/${campaignId}/messages`)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish message')
    } finally {
      setLoading(false)
    }
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600 font-medium">Loading campaign...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-2"
          >
            ← Back
          </button>
          <h1 className="text-lg font-bold text-slate-900">Create Message</h1>
          <div className="w-20"></div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 font-medium">
            ✓ Message published successfully!
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Message Content */}
            <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-6">Message Content</h2>
              
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your message here... Share what's on your mind!"
                className="w-full h-48 px-4 py-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder:text-slate-400 resize-none"
              />

              {/* Character Counter */}
              <div className="mt-4 flex items-center justify-between">
                <p className={`text-sm font-medium ${charWarning ? 'text-red-600' : 'text-slate-600'}`}>
                  {charCount} / {charLimit} characters
                </p>
                {charWarning && (
                  <p className="text-xs text-red-600">⚠️ Approaching platform limit</p>
                )}
              </div>

              {/* AI Suggestion Button */}
              <button
                onClick={generateAiSuggestion}
                disabled={loading}
                className="mt-4 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition flex items-center gap-2"
              >
                ✨ AI Suggestion
              </button>

              {/* AI Suggestion Display */}
              {showAiSuggestion && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm font-medium text-slate-900 mb-2">AI Suggestion:</p>
                  <p className="text-slate-700 mb-3">{aiSuggestion}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={applyAiSuggestion}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setShowAiSuggestion(false)}
                      className="flex-1 px-3 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-300 transition"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Media Upload */}
            <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-6">Media & Attachments</h2>
              
              <label className="block">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleMediaUpload}
                    className="hidden"
                    disabled={mediaFiles.length >= 5}
                  />
                  <div className="text-4xl mb-2">📸</div>
                  <p className="text-sm font-medium text-slate-900">Click to upload media</p>
                  <p className="text-xs text-slate-500 mt-1">Images & videos • Up to 50MB each • Max 5 files</p>
                </div>
              </label>

              {/* Media Preview */}
              {mediaPreview.length > 0 && (
                <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                  {mediaPreview.map((preview, idx) => (
                    <div key={idx} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview}
                        alt={`Preview ${idx}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeMedia(idx)}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Platform Selection */}
            <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-6">Select Platforms</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {PLATFORMS.map(platform => (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`p-4 rounded-xl border-2 transition ${
                      selectedPlatforms.includes(platform.id)
                        ? `border-blue-600 bg-blue-50`
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">{platform.icon}</div>
                    <p className="font-medium text-slate-900 text-sm">{platform.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{platform.charLimit} chars</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-6">Schedule (Optional)</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Time</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Preview & Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Campaign Info */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm sticky top-24">
              <h3 className="font-bold text-slate-900 mb-4">Campaign</h3>
              <div className="flex items-center gap-3 mb-4">
                {campaign.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={campaign.logo}
                    alt="Campaign"
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <div>
                  <p className="font-semibold text-slate-900">{campaign.name}</p>
                  <p className="text-xs text-slate-500">{campaign.icon}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => handlePublish('draft')}
                  disabled={loading}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition disabled:opacity-50"
                >
                  💾 Save Draft
                </button>
                <button
                  onClick={() => handlePublish('posted')}
                  disabled={loading || !selectedPlatforms.length}
                  className="w-full px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition disabled:opacity-50"
                >
                  🚀 Post Now
                </button>
                {scheduledDate && scheduledTime && (
                  <button
                    onClick={() => handlePublish('scheduled')}
                    disabled={loading}
                    className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    📅 Schedule Post
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
