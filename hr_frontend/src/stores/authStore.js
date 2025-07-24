import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

// API 기본 URL 설정
const API_BASE_URL = 'http://localhost:5007/api';
// Axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // 상태
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // 액션
      login: async (username, password) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await api.post('/auth/login', {
            username,
            password,
          })

          const { access_token, refresh_token, user } = response.data

          // Axios 기본 헤더에 토큰 설정
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

          set({
            user,
            accessToken: access_token,
            refreshToken: refresh_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })

          return { success: true }
        } catch (error) {
          const errorMessage = error.response?.data?.error || '로그인 중 오류가 발생했습니다.'
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          })
          return { success: false, error: errorMessage }
        }
      },

      logout: async () => {
        const { accessToken } = get()
        
        try {
          if (accessToken) {
            await api.post('/auth/logout')
          }
        } catch (error) {
          console.error('로그아웃 요청 실패:', error)
        } finally {
          // 로컬 상태 초기화
          delete api.defaults.headers.common['Authorization']
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get()
        
        if (!refreshToken) {
          get().logout()
          return false
        }

        try {
          const response = await api.post('/auth/refresh', {}, {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          })

          const { access_token } = response.data
          
          // 새 토큰으로 헤더 업데이트
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
          
          set({ accessToken: access_token })
          return true
        } catch (error) {
          console.error('토큰 갱신 실패:', error)
          get().logout()
          return false
        }
      },

      getCurrentUser: async () => {
        try {
          const response = await api.get('/auth/me')
          const { user, employee } = response.data
          
          set({ 
            user: { ...user, employee },
            error: null 
          })
          
          return { success: true, user, employee }
        } catch (error) {
          const errorMessage = error.response?.data?.error || '사용자 정보 조회 실패'
          set({ error: errorMessage })
          return { success: false, error: errorMessage }
        }
      },

      changePassword: async (currentPassword, newPassword) => {
        set({ isLoading: true, error: null })
        
        try {
          await api.post('/auth/change-password', {
            current_password: currentPassword,
            new_password: newPassword,
          })

          set({ isLoading: false, error: null })
          return { success: true }
        } catch (error) {
          const errorMessage = error.response?.data?.error || '비밀번호 변경 실패'
          set({ isLoading: false, error: errorMessage })
          return { success: false, error: errorMessage }
        }
      },

      initializeAuth: () => {
        const { accessToken, user } = get()
        
        if (accessToken && user) {
          // 저장된 토큰으로 Axios 헤더 설정
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
          set({ isAuthenticated: true })
          
          // 사용자 정보 갱신
          get().getCurrentUser()
        }
      },

      clearError: () => {
        set({ error: null })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// Axios 인터셉터 설정 (토큰 자동 갱신)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const authStore = useAuthStore.getState()
      const refreshed = await authStore.refreshAccessToken()

      if (refreshed) {
        // 새 토큰으로 원래 요청 재시도
        originalRequest.headers.Authorization = `Bearer ${authStore.accessToken}`
        return api(originalRequest)
      }
    }

    return Promise.reject(error)
  }
)

// API 인스턴스를 외부에서 사용할 수 있도록 export
export { api }

