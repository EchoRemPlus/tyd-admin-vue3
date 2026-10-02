import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getInfo, login as loginApi, logout as logoutApi } from '@/api/system'
import { TOKEN_KEY } from '@/api/http'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '')
  const user = ref<Record<string, any> | null>(null)
  const roles = ref<string[]>([])
  const permissions = ref<string[]>([])
  const isAdmin = computed(() => roles.value.includes('admin'))

  async function login(form: Record<string, unknown>) {
    const result: any = await loginApi(form)
    token.value = result.token || ''
    localStorage.setItem(TOKEN_KEY, token.value)
    await fetchProfile()
  }

  async function fetchProfile() {
    const result: any = await getInfo()
    user.value = result.user || {}
    roles.value = result.roles || []
    permissions.value = result.permissions || []
  }

  function hasPermission(permission?: string) {
    if (!permission || isAdmin.value) return true
    return permissions.value.includes('*:*:*') || permissions.value.includes(permission)
  }

  async function logout() {
    try { await logoutApi() } finally {
      token.value = ''
      user.value = null
      roles.value = []
      permissions.value = []
      localStorage.removeItem(TOKEN_KEY)
    }
  }

  return { token, user, roles, permissions, isAdmin, login, fetchProfile, hasPermission, logout }
})
