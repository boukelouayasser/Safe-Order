/**
 * Safe Order — Orders API endpoints
 */
import { api, getApiBaseUrl } from './client'

export interface OrderResponse {
  id: string
  merchant_id: string
  customer_id: string | null
  tracking_code: string
  order_link_token: string
  product_name: string
  product_description: string | null
  product_photos: string[]
  product_price: number
  delivery_company: string | null
  delivery_mode: 'home' | 'pickup' | null
  delivery_fee: number
  customer_wilaya: string | null
  customer_municipality: string | null
  customer_address: string | null
  customer_phone: string | null
  customer_first_name: string | null
  customer_last_name: string | null
  customer_remark: string | null
  safe_pay_amount: number
  remaining_amount: number
  status: OrderStatus
  badge: OrderBadge | null
  risk_score: number
  confirmed_at: string | null
  prepared_at: string | null
  dispatched_at: string | null
  delivered_at: string | null
  returned_at: string | null
  created_at: string
}

export type OrderStatus = 'confirmation' | 'preparation' | 'dispatch' | 'delivery' | 'delivered' | 'return_processed'
export type OrderBadge = 'safe_pay' | 'new' | 'loyal' | 'risk'

export interface OrderSummary {
  id: string
  tracking_code: string
  product_name: string
  product_price: number
  status: OrderStatus
  badge: OrderBadge | null
  customer_first_name: string | null
  customer_last_name: string | null
  customer_wilaya: string | null
  safe_pay_amount: number
  created_at: string
}

export interface PipelineCounts {
  confirmation: number
  preparation: number
  dispatch: number
  delivery: number
  delivered: number
  return_processed: number
  total: number
}

export interface TrackingEvent {
  id: string
  status: OrderStatus
  note: string | null
  created_at: string
}

export const ordersApi = {
  create: (data: {
    product_name: string
    product_description?: string
    product_photos?: string[]
    product_price: number
    delivery_fee?: number
    safe_pay_percentage?: number
  }) => api.post<{ order: OrderResponse; customer_link: string }>('/api/orders/', data),

  getByLink: (token: string) => api.get<OrderResponse>(`/api/orders/link/${token}`),

  fillOrder: (token: string, data: {
    first_name: string
    last_name: string
    phone: string
    delivery_company: string
    delivery_mode: 'home' | 'pickup'
    wilaya: string
    municipality: string
    address: string
    remark?: string
  }) => api.post<OrderResponse>(`/api/orders/link/${token}/fill`, data),

  getPipelineCounts: () => api.get<PipelineCounts>('/api/orders/pipeline/counts'),

  getByStatus: (status: string, page = 1) =>
    api.get<OrderSummary[]>(`/api/orders/pipeline/${status}?page=${page}`),

  getAll: (page = 1) => api.get<OrderSummary[]>(`/api/orders/all?page=${page}`),

  getById: (id: string) => api.get<OrderResponse>(`/api/orders/${id}`),

  getTracking: (id: string) => api.get<TrackingEvent[]>(`/api/orders/${id}/tracking`),

  getByTrackingCode: (code: string) => api.get<OrderResponse>(`/api/orders/track/${code}`),

  updateStatus: (id: string, status: string, note?: string) =>
    api.patch<OrderResponse>(`/api/orders/${id}/status`, { status, note }),

  updateOrder: (id: string, data: {
    product_name?: string
    product_description?: string
    product_price?: number
    delivery_fee?: number
    safe_pay_percentage?: number
  }) => api.put<OrderResponse>(`/api/orders/${id}`, data),

  deleteOrder: (id: string) =>
    api.delete<{ message: string; order_id: string }>(`/api/orders/${id}`),

  getCustomerOrders: (phone: string) =>
    api.get<OrderSummary[]>(`/api/orders/customer/by-phone/${phone}`),

  /** Open the printable PDF label in a new tab. Auth header is sent via fetch + blob. */
  openLabel: async (orderId: string) => {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${getApiBaseUrl()}/api/orders/${orderId}/label`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}))
      throw new Error(detail.detail || `Erreur ${res.status}`)
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  },

  getDMinus1Alerts: () =>
    api.get<{
      today: string
      alerts: Array<{
        order_id: string
        tracking_code: string
        product_name: string
        customer_name: string
        customer_phone: string
        remark: string
        delivery_date: string
        days_until: number
        is_d_minus_1: boolean
      }>
    }>('/api/orders/alerts/d-minus-1'),
}
