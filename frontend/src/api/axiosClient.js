import axios from 'axios'
import { supabase } from './supabaseClient'

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
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
