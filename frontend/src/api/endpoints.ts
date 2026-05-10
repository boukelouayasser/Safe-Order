/**
 * Safe Order — Stats & Payments & Feedback API
 */
import { api } from './client'

export const statsApi = {
  getDashboard: () => api.get<any>('/api/stats/dashboard'),
  getInsights: () => api.get<any>('/api/stats/insights'),
}

export const paymentsApi = {
  process: (data: {
    order_id: string
    method: 'cib' | 'dahabia' | 'baridimob'
    card_number?: string
    card_holder?: string
    expiry?: string
    cvv?: string
  }) => api.post<any>('/api/payments/process', data),

  getOrderPayments: (orderId: string) => api.get<any[]>(`/api/payments/order/${orderId}`),
  getWallet: (phone: string) => api.get<any>(`/api/payments/wallet/${encodeURIComponent(phone)}`),
  getWalletHistory: (phone: string, period: 'weekly' | 'monthly') =>
    api.get<{
      phone: string
      period: 'weekly' | 'monthly'
      buckets: Array<{
        key: string
        label: string
        total_price: number
        total_deposit: number
        total_remaining: number
        delivery_fees: number
        order_count: number
        delivered: number
        returned: number
        orders: Array<{
          id: string
          tracking_code: string
          product_name: string
          product_price: number
          delivery_fee: number
          safe_pay_amount: number
          remaining_amount: number
          status: string
          created_at: string
        }>
      }>
    }>(`/api/payments/wallet/${encodeURIComponent(phone)}/history?period=${period}`),
  refund: (orderId: string) => api.post<any>(`/api/payments/refund/${orderId}`),
}

export const feedbackApi = {
  submit: (data: {
    order_id: string
    rating: number
    criteria: string[]
    comment?: string
  }) => api.post<any>('/api/feedback/submit', data),

  getByOrder: (orderId: string) => api.get<any>(`/api/feedback/order/${orderId}`),
  getByMerchant: (merchantId: string) => api.get<any[]>(`/api/feedback/merchant/${merchantId}`),
  getTrustScore: (userId: string) => api.get<any>(`/api/feedback/trust-score/${userId}`),
  analyzeReturn: (orderId: string) => api.post<any>(`/api/feedback/analyze-return/${orderId}`),
}

export const trackingApi = {
  track: (code: string) => api.get<any>(`/api/tracking/track/${encodeURIComponent(code)}`),
  addRemark: (code: string, remark: string, phone: string) =>
    api.post<any>(`/api/tracking/track/${encodeURIComponent(code)}/remark`, { remark, phone }),
  getByPhone: (phone: string) => api.get<any[]>(`/api/tracking/by-phone/${encodeURIComponent(phone)}`),
}

export const demoApi = {
  getAccounts: () => api.get<any>('/api/demo/accounts'),
  quickLogin: (role: string) => api.post<any>(`/api/demo/quick-login/${role}`),
  advanceOrder: (orderId: string) => api.post<any>(`/api/demo/advance-order/${orderId}`),
  reset: () => api.post<any>('/api/demo/reset'),
}
