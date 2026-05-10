/**
 * Safe Order — Auth API endpoints
 */
import { api } from './client'

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface UserResponse {
  id: string
  role: 'customer' | 'merchant' | 'admin'
  first_name: string
  last_name: string
  phone: string
  email: string | null
  wilaya: string | null
  municipality: string | null
  address: string | null
  language: 'fr' | 'en' | 'ar'
  trust_score: number
  is_verified: boolean
  created_at: string
}

export interface MerchantProfile {
  id: string
  store_name: string
  delivery_companies: string[]
  safe_standards_accepted: boolean
  safe_standards_accepted_at: string | null
  total_orders: number
  total_delivered: number
  total_returned: number
}

export interface MerchantFullResponse {
  user: UserResponse
  profile: MerchantProfile
}

export interface DeliveryCompany {
  name: string
  slug: string
  has_api: boolean
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<TokenResponse>('/api/auth/login', { email, password }),

  registerMerchant: (data: {
    first_name: string
    last_name: string
    phone: string
    email: string
    password: string
    store_name: string
    wilaya: string
    municipality: string
    address?: string
    delivery_companies: string[]
    language?: string
  }) => api.post<TokenResponse>('/api/auth/register/merchant', data),

  registerCustomer: (data: { phone: string; first_name?: string; last_name?: string }) =>
    api.post<TokenResponse>('/api/auth/register/customer', data),

  sendOtp: (phone: string, purpose = 'registration') =>
    api.post<{ message: string; phone: string; expires_in: number; demo_code?: string }>(
      '/api/auth/otp/send', { phone, purpose }
    ),

  verifyOtp: (
    phone: string,
    code: string,
    purpose = 'registration',
    extra?: { first_name?: string; last_name?: string; language?: string },
  ) =>
    api.post<TokenResponse>('/api/auth/otp/verify', {
      phone,
      code,
      purpose,
      ...(extra || {}),
    }),

  customerExists: (phone: string) =>
    api.get<{ exists: boolean; first_name: string | null }>(
      `/api/auth/customer/exists/${encodeURIComponent(phone)}`,
    ),

  refreshToken: (refresh_token: string) =>
    api.post<TokenResponse>('/api/auth/refresh', { refresh_token }),

  getMe: () => api.get<UserResponse>('/api/auth/me'),

  getMeMerchant: () => api.get<MerchantFullResponse>('/api/auth/me/merchant'),

  acceptSafeStandards: () =>
    api.post<{ message: string }>('/api/auth/safe-standards', {
      authentic_photos: true,
      complete_description: true,
      careful_packaging: true,
    }),

  getSafeStandardsStatus: () =>
    api.get<{ accepted: boolean; accepted_at: string | null }>('/api/auth/safe-standards/status'),

  getDeliveryCompanies: () => api.get<DeliveryCompany[]>('/api/auth/delivery-companies'),

  getWilayas: () => api.get<string[]>('/api/auth/wilayas'),

  // Demo shortcuts
  quickLogin: (role: string) =>
    api.post<TokenResponse & { message: string }>(`/api/demo/quick-login/${role}`),
}
