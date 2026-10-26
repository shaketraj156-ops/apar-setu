import axios from 'axios'
import { supabase } from './supabaseClient'

/**
 * All API calls use a SAME-ORIGIN relative base URL ('/api').
 *
 * Dev:  Vite dev server proxies /api/* → http://localhost:8000/api/*  (vite.config.js)
 * Prod: Vercel rewrites /api/* → https://snap-backend-rq8g.onrender.com/api/*  (vercel.json)
 *
 * Using a relative URL means ad-blockers (McAfee WebAdvisor, Brave Shields, uBlock Origin)
 * cannot block requests — the browser only ever calls its own origin.
 */
const axiosClient = axios.create({
  baseURL: '',
})

axiosClient.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) config.headers.Authorization = `Bearer ${session.access_token}`
  return config
})

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await supabase.auth.signOut()
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('apaarsetu:unauthorized'))
    }
    return Promise.reject(error)
  },
)

export default axiosClient
