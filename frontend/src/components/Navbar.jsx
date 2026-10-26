import React, { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Sun,
  Moon,
  Menu,
  X,
  LayoutDashboard,
  LogOut,
  Sparkles,
  ChevronDown,
  User,
  ExternalLink
} from 'lucide-react'
import { supabase } from '../api/supabaseClient'
import useAuth from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { rolePaths } from '../routes/RoleBasedRedirect'
import { DEMO_ENABLED } from '../config/demoAccounts'
import { Avatar, Badge, Button } from './common'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Features', href: '/features' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'About', href: '/about' }
]

const roleDisplayNames = {
  institution_admin: 'Institution Admin',
  institution_staff: 'Institution Staff',
  aicte_officer: 'AICTE Officer',
  system_admin: 'System Admin',
  auditor: 'Auditor',
  student: 'Student',
  verifier: 'Verifier / Employer'
}

export default function Navbar() {
  const { user, profile, role } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  const dashboardPath = rolePaths[role] || '/'

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUserDropdownOpen(false)
    setMobileOpen(false)
    navigate('/', { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-slate-900/85">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 h-16">
        
        {/* Brand Logo */}
        <Link
          to="/"
          className="flex items-center gap-3 group focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
          aria-label="SNAP Home"
        >
          <img src="/snap-logo.png" alt="SNAP logo" className="h-10 w-10 object-contain group-hover:scale-105 transition-transform" />

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                SNAP
              </span>
              <span className="hidden sm:inline-block rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/60 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/40">
                AICTE
              </span>
            </div>
            <span className="hidden md:block text-[11px] font-medium text-slate-500 dark:text-slate-400 -mt-0.5">
              Student Network &amp; APAAR Portal
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {navLinks.map(({ label, href }) => (
            <NavLink
              key={href}
              to={href}
              end={href === '/'}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors duration-150 ${
                  isActive
                    ? 'text-blue-700 bg-blue-50/80 dark:bg-blue-950/50 dark:text-blue-400'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right Section: Theme Toggle & User / Auth Actions */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
          </button>

          {user ? (
            /* Logged In State with Dropdown */
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center gap-2">
                <Link
                  to={dashboardPath}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:from-blue-700 hover:to-blue-800 transition"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>Portal</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setUserDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80 transition cursor-pointer"
                  aria-expanded={userDropdownOpen}
                >
                  <Avatar name={profile?.full_name || user.email} role={role} size="sm" />
                  <span className="max-w-[110px] truncate text-left">
                    <span className="block text-[11px] font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
                      {profile?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                    </span>
                    <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-400 capitalize truncate">
                      {roleDisplayNames[role] || role}
                    </span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </div>

              {/* User Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {profile?.full_name || 'User Profile'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </p>
                    <div className="mt-1.5">
                      <Badge variant="brand" size="xs">
                        {roleDisplayNames[role] || role}
                      </Badge>
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      to={dashboardPath}
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                    >
                      <LayoutDashboard className="h-4 w-4 text-slate-400" />
                      <span>Role Dashboard</span>
                    </Link>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
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
          ) : (
            /* Logged Out State */
            <div className="flex items-center gap-2">
              {DEMO_ENABLED && (
                <Link
                  to="/demo"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300 transition"
                >
                  <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Try Demo</span>
                </Link>
              )}

              <Link
                to="/login"
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger & Theme Toggle Button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-expanded={mobileOpen}
            aria-label="Toggle mobile menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <nav
          className="border-t border-slate-200 bg-white/95 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/95 backdrop-blur-md md:hidden animate-in slide-in-from-top-4 duration-150"
          aria-label="Mobile navigation"
        >
          <div className="grid gap-1.5">
            {navLinks.map(({ label, href }) => (
              <NavLink
                key={href}
                to={href}
                end={href === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}

            <div className="my-2 border-t border-slate-100 dark:border-slate-800" />

            {user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-850 rounded-xl">
                  <Avatar name={profile?.full_name || user.email} role={role} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {profile?.full_name || user.email}
                    </p>
                    <p className="text-[11px] text-slate-500 capitalize">
                      {roleDisplayNames[role] || role}
                    </p>
                  </div>
                </div>

                <Link
                  to={dashboardPath}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 py-2.5 text-xs font-bold text-white shadow-xs"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Open Portal Dashboard</span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="grid gap-2 pt-1">
                {DEMO_ENABLED && (
                  <Link
                    to="/demo"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-xs font-bold text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Try Demo Mode</span>
                  </Link>
                )}
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-200"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center rounded-xl bg-blue-700 py-2.5 text-xs font-bold text-white"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
