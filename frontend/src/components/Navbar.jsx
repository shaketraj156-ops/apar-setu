import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import useAuth from '../hooks/useAuth'
import { rolePaths } from '../routes/RoleBasedRedirect'
import { DEMO_ENABLED } from '../config/demoAccounts'

const links = [['Home', '/'], ['Features', '/features'], ['How It Works', '/how-it-works'], ['About', '/about']]
export default function Navbar() {
  const { user, role } = useAuth(); const [open, setOpen] = useState(false); const navigate = useNavigate()
  const dashboard = rolePaths[role]
  const logout = async () => { await supabase.auth.signOut(); setOpen(false); navigate('/', { replace: true }) }
  const navClass = ({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`
  return <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8"><Link to="/" className="flex shrink-0 items-center gap-3" aria-label="APAARSetu home"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-800 font-black text-white">AS</span><span><span className="block text-lg font-extrabold tracking-tight text-slate-950">APAAR<span className="text-blue-700">Setu</span></span><span className="hidden text-xs text-slate-500 sm:block">Academic records, connected</span></span></Link>
      <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">{links.map(([label, href]) => <NavLink key={href} to={href} end={href === '/'} className={navClass}>{label}</NavLink>)}</nav>
      <div className="hidden items-center gap-2 md:flex">{user ? <><Link to={dashboard || '/'} className="button-primary !px-4 !py-2">Dashboard</Link><button type="button" className="button-secondary !px-4 !py-2" onClick={logout}>Logout</button></> : <>{DEMO_ENABLED && <Link to="/demo" className="button-secondary !px-4 !py-2">Try Demo</Link>}<Link to="/login" className="nav-link">Login</Link><Link to="/register" className="button-primary !px-4 !py-2">Register</Link></>}</div>
      <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 md:hidden" aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen((value) => !value)}>{open ? 'Close' : 'Menu'}</button>
    </div>
    {open && <nav id="mobile-navigation" className="border-t border-slate-100 px-5 py-3 md:hidden" aria-label="Mobile navigation"><div className="grid gap-1">{links.map(([label, href]) => <NavLink onClick={() => setOpen(false)} key={href} to={href} end={href === '/'} className={navClass}>{label}</NavLink>)}{user ? <><Link onClick={() => setOpen(false)} to={dashboard || '/'} className="nav-link">Dashboard</Link><button onClick={logout} className="nav-link text-left">Logout</button></> : <>{DEMO_ENABLED && <Link onClick={() => setOpen(false)} to="/demo" className="nav-link font-semibold text-blue-700">Try Demo</Link>}<Link onClick={() => setOpen(false)} to="/login" className="nav-link">Login</Link><Link onClick={() => setOpen(false)} to="/register" className="nav-link">Register</Link></>}</div></nav>}
  </header>
}
