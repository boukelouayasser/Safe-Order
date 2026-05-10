/**
 * Safe Order — HTTP client
 * Reads VITE_API_URL at build time. Falls back to localhost in dev.
 * Strips trailing slash so callers can always pass `/api/...`.
 */
const RAW_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').trim()
const API_BASE_URL = RAW_BASE.endsWith('/') ? RAW_BASE.slice(0, -1) : RAW_BASE

export function getApiBaseUrl() {
  return API_BASE_URL
}

interface RequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: unknown
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', headers = {}, body } = options

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body !== undefined) {
    config.body = JSON.stringify(body)
  }

  const token = localStorage.getItem('access_token')
  if (token) {
    (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`

  let response: Response
  try {
    response = await fetch(url, config)
  } catch (e: any) {
    throw new Error(
      `Impossible de joindre le serveur (${API_BASE_URL}). Vérifiez votre connexion ou la variable VITE_API_URL.`,
    )
  }

  if (!response.ok) {
    let detail: string | undefined
    try {
      const data = await response.json()
      // FastAPI returns {detail: string} or {detail: [{msg: ...}]} for validation errors.
      if (typeof data?.detail === 'string') detail = data.detail
      else if (Array.isArray(data?.detail)) detail = data.detail.map((d: any) => d.msg).join(', ')
      else if (data?.message) detail = data.message
    } catch { /* not JSON */ }

    throw new Error(detail || `Erreur ${response.status}`)
  }

  if (response.status === 204) return {} as T
  return response.json()
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body?: unknown) => request<T>(endpoint, { method: 'POST', body }),
  put: <T>(endpoint: string, body?: unknown) => request<T>(endpoint, { method: 'PUT', body }),
  patch: <T>(endpoint: string, body?: unknown) => request<T>(endpoint, { method: 'PATCH', body }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
}
