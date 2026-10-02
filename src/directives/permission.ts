import type { Directive } from 'vue'
import { useAuthStore } from '@/stores/auth'

/**
 * 权限指令：v-permission="'system:user:add'" 或 v-permission="['a', 'b']"。
 *
 * 当前用户不具备所需权限时移除元素。多权限码之间为"或"关系。
 * 该指令只用于界面收敛，后端 @PreAuthorize 仍是权限判定的最终依据。
 */
export const permission: Directive<HTMLElement, string | string[]> = {
  mounted(el, binding) {
    const auth = useAuthStore()
    const value = binding.value
    const codes = Array.isArray(value) ? value : value ? [value] : []
    if (!codes.length) return
    const allowed = codes.some(code => auth.hasPermission(code))
    if (!allowed) {
      el.parentNode?.removeChild(el)
    }
  }
}