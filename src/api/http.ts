import axios from 'axios'
import { ElMessage } from 'element-plus'

const TOKEN_KEY = 'tyd_ops_token'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  timeout: 15000
})

http.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  response => {
    const payload = response.data
    if (payload?.code === 401) {
      localStorage.removeItem(TOKEN_KEY)
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
      return Promise.reject(new Error('登录状态已过期'))
    }
    if (payload?.code && payload.code !== 200) {
      ElMessage.error(payload.msg || '请求处理失败')
      return Promise.reject(new Error(payload.msg || '请求处理失败'))
    }
    return payload
  },
  error => {
    const status = error?.response?.status
    if (status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    ElMessage.error(error?.response?.data?.msg || error?.message || '网络请求失败')
    return Promise.reject(error)
  }
)

export { TOKEN_KEY }
export default http
