import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Menu,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Building,
  User,
  Home
} from 'lucide-react'
import { supabase } from '../../api/supabaseClient'
import useAuth from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { Avatar, Badge } from '../common'

const pathTitles = {
  '/institution': 'Institution Intake & Batches',
  '/institution/students': 'Student Enrolment Roster',
  '/aicte': 'AICTE National Oversight Dashboard',
  '/aicte/reports': 'Compliance & Intake Reports',
  '/aicte/audit': 'Append-Only Audit Trail',
  '/student': 'Student Academic Identity',
  '/student/consent': 'Third-Party Verification Consent Gate',
  '/verifier': 'Public Credential Verification Engine'
}

export default function Topbar({ onMobileMenuClick }) {
  const { user, profile, role } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const menuRef = useRef(null)

  const currentTitle = pathTitles[location.pathname] || 'Dashboard'

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    navigate('/', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 sm:px-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85 transition-colors">
      
      {/* Left: Hamburger + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMobileMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold">
          <Link
            to="/"
            className="flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <span className="text-slate-900 dark:text-white font-bold truncate max-w-[200px] sm:max-w-xs">
            {currentTitle}
          </span>
        </nav>
      </div>

      {/* Right: Theme Toggle & User Menu */}
      <div className="flex items-center gap-2.5">
        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          title={isDark ? 'Light mode' : 'Dark mode'}
          aria-label="Toggle dark mode"
        >
          {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
        </button>

        {/* User Avatar & Logout Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((d) => !d)}
            className="flex items-center gap-2 rounded-xl p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <Avatar name={profile?.full_name || user?.email} role={role} size="sm" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900 z-50">
              <div className="p-2.5 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {profile?.full_name || user?.email}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {user?.email}
                </p>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition text-left cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

    </header>
  )
}
