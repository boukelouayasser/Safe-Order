/**
 * Safe Order — Auth Context
 * Manages authentication state, tokens, and user data across the app.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi, UserResponse, MerchantProfile, TokenResponse } from '../api/auth'

interface AuthState {
  user: UserResponse | null
  merchantProfile: MerchantProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<UserResponse>
  loginWithTokens: (tokens: Pick<TokenResponse, 'access_token' | 'refresh_token'>) => Promise<UserResponse>
  quickLogin: (role: string) => Promise<UserResponse>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [merchantProfile, setMerchantProfile] = useState<MerchantProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUser = useCallback(async (): Promise<UserResponse | null> => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setUser(null)
      setMerchantProfile(null)
      setIsLoading(false)
      return null
    }
    try {
      const userData = await authApi.getMe()
      setUser(userData)
      if (userData.role === 'merchant') {
        try {
          const merchantData = await authApi.getMeMerchant()
          setMerchantProfile(merchantData.profile)
        } catch {
          setMerchantProfile(null)
        }
      } else {
        setMerchantProfile(null)
      }
      return userData
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      setUser(null)
      setMerchantProfile(null)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const persistTokens = (tokens: Pick<TokenResponse, 'access_token' | 'refresh_token'>) => {
    localStorage.setItem('access_token', tokens.access_token)
    localStorage.setItem('refresh_token', tokens.refresh_token)
  }

  const login = async (email: string, password: string) => {
    const tokens = await authApi.login(email, password)
    persistTokens(tokens)
    const u = await fetchUser()
    if (!u) throw new Error("Impossible de récupérer le profil après connexion")
    return u
  }

  const loginWithTokens = async (tokens: Pick<TokenResponse, 'access_token' | 'refresh_token'>) => {
    persistTokens(tokens)
    const u = await fetchUser()
    if (!u) throw new Error("Token invalide")
    return u
  }

  const quickLogin = async (role: string) => {
    const result = await authApi.quickLogin(role)
    return loginWithTokens(result)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    // Drop the customer-side identity hint so the next visitor doesn't
    // accidentally see the previous user's pre-filled phone in /track.
    localStorage.removeItem('customer_phone')
    setUser(null)
    setMerchantProfile(null)
  }

  const refreshUser = async () => {
    await fetchUser()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        merchantProfile,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithTokens,
        quickLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
