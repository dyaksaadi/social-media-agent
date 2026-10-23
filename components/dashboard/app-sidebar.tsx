'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import insforge from '@/lib/insforge-client'
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  Calendar,
  BarChart3,
  Users,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Check,
  ChevronDown,
} from 'lucide-react'

interface Campaign {
  id: string
  name: string
  icon: string
  logo?: string | null
}

const NAV_ITEMS = [
  { label: 'Overview', icon: LayoutDashboard, href: '/dashboard', bg: 'bg-blue-100 text-blue-600' },
  { label: 'AI Agent', icon: Sparkles, href: '/dashboard/ai-agent', bg: 'bg-purple-100 text-purple-600' },
  { label: 'Posts', icon: FileText, href: '/dashboard/posts', bg: 'bg-green-100 text-green-600' },
  { label: 'Calendar', icon: Calendar, href: '/dashboard/calendar', bg: 'bg-orange-100 text-orange-600' },
  { label: 'Analytics', icon: BarChart3, href: '/dashboard/analytics', bg: 'bg-pink-100 text-pink-600' },
  { label: 'Accounts', icon: Users, href: '/dashboard/accounts', bg: 'bg-teal-100 text-teal-600' },
  { label: 'Settings', icon: Settings, href: '/dashboard/settings', bg: 'bg-slate-200 text-slate-700' },
]

interface AppSidebarProps {
  userId: string
  collapsed: boolean
  onToggle: () => void
}

export default function AppSidebar({ userId, collapsed, onToggle }: AppSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!userId) return
      try {
        const { data } = await insforge.database
          .from('campaigns')
          .select('id, name, icon, logo')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        setCampaigns(data || [])
        if (data && data.length > 0) {
          setActiveCampaign(data[0])
        }
      } catch (err) {
        console.error('Error fetching campaigns:', err)
      }
    }

    fetchCampaigns()
  }, [userId])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSwitch = (campaign: Campaign) => {
    setActiveCampaign(campaign)
    setDropdownOpen(false)
    router.push('/dashboard')
  }

  const handleCreateNew = () => {
    setDropdownOpen(false)
    router.push('/campaigns/create')
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white border-r border-slate-200 flex flex-col z-50 transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[76px]' : 'w-[260px]'
      }`}
    >
      {/* Logo Section */}
      <div className="p-4 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white font-bold flex items-center justify-center flex-shrink-0 shadow-sm">
            AI
          </div>
          <div
            className={`whitespace-nowrap transition-all duration-300 ${
              collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'
            }`}
          >
            <p className="text-sm font-bold text-slate-900 leading-tight">Social Agent</p>
            <p className="text-[11px] text-slate-500">AI Platform</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition flex-shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Campaign Switcher */}
      <div className="p-3 border-b border-slate-100" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`w-full flex items-center gap-2 rounded-xl border border-slate-200 hover:border-slate-300 transition group ${
            collapsed ? 'p-2 justify-center' : 'p-3'
          }`}
          title={collapsed ? activeCampaign?.name || 'Campaign' : undefined}
        >
          {activeCampaign?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeCampaign.logo}
              alt=""
              className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <span className="text-xl flex-shrink-0">{activeCampaign?.icon || '🚀'}</span>
          )}
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs text-slate-500 leading-none">Campaign</p>
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {activeCampaign?.name || 'No campaign'}
                </p>
              </div>
              <ChevronDown
                size={14}
                className={`text-slate-400 flex-shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </>
          )}
        </button>

        {/* Dropdown */}
        {dropdownOpen && !collapsed && (
          <div className="absolute left-3 right-3 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
            <div className="max-h-48 overflow-y-auto">
              {campaigns.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSwitch(c)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition text-left"
                >
                  <span className="text-lg">{c.icon}</span>
                  <span className="flex-1 text-sm font-medium text-slate-900 truncate">{c.name}</span>
                  {activeCampaign?.id === c.id && <Check size={14} className="text-blue-600 flex-shrink-0" />}
                </button>
              ))}
            </div>
            <button
              onClick={handleCreateNew}
              className="w-full flex items-center gap-2 px-3 py-2.5 border-t border-slate-100 bg-slate-50 hover:bg-blue-50 text-blue-600 transition text-left"
            >
              <Plus size={16} />
              <span className="text-sm font-semibold">Create New Campaign</span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          return (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 rounded-xl transition group relative ${
                collapsed ? 'p-2 justify-center' : 'p-2.5'
              } ${isActive ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full" />
              )}
              <span
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition ${
                  isActive ? item.bg : 'bg-transparent group-hover:' + item.bg
                }`}
              >
                <item.icon size={18} className={isActive ? '' : 'text-slate-500 group-hover:currentColor'} />
              </span>
              {!collapsed && (
                <span
                  className={`text-sm whitespace-nowrap transition-all duration-300 ${
                    isActive ? 'font-semibold text-blue-600' : 'font-medium text-slate-700'
                  }`}
                >
                  {item.label}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-100">
        <div
          className={`flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 ${
            collapsed ? 'p-2 justify-center' : 'p-3'
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
            ✨
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900">Go Pro</p>
              <p className="text-[11px] text-slate-500">Unlock AI features</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
