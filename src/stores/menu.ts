import { ref } from 'vue'
import { defineStore } from 'pinia'
import http from '@/api/http'
import { COMPONENT_ROUTES, FALLBACK_TITLES, type ConsoleMenuItem } from '@/config/consoleMenu'

interface RouterNode {
  path?: string
  component?: string
  meta?: { title?: string; icon?: string }
  children?: RouterNode[]
}

/**
 * 控制台菜单状态。
 *
 * 从后端 /getRouters 读取当前用户可见菜单，映射为控制台可用的导航项；
 * 接口异常或正常返回空菜单都按“无可用菜单”处理，必须失败关闭；
 * 不能回退成全部菜单，否则接口故障时会把未授权页面暴露给普通账号。
 */
export const useMenuStore = defineStore('consoleMenu', () => {
  const items = ref<ConsoleMenuItem[]>([])
  const loaded = ref(false)
  const source = ref<'server' | 'error'>('error')

  async function load() {
    try {
      const result: any = await http.get<RouterNode[]>('/getRouters')
      const collected = new Map<string, ConsoleMenuItem>()
      walk(result.data || [], collected)
      if (collected.size) {
        items.value = Array.from(collected.values()).sort((a, b) => a.order - b.order)
        source.value = 'server'
      } else {
        items.value = []
        source.value = 'server'
      }
    } catch {
      items.value = []
      source.value = 'error'
    } finally {
      loaded.value = true
    }
  }

  function walk(nodes: RouterNode[], collected: Map<string, ConsoleMenuItem>) {
    for (const node of nodes) {
      const component = node.component || ''
      const route = COMPONENT_ROUTES[component]
      if (route && !collected.has(route.path)) {
        collected.set(route.path, {
          path: route.path,
          icon: route.icon,
          order: route.order,
          title: node.meta?.title || FALLBACK_TITLES[route.path] || route.path
        })
      }
      if (node.children?.length) {
        walk(node.children, collected)
      }
    }
  }

  function reset() {
    items.value = []
    loaded.value = false
    source.value = 'error'
  }

  function hasPath(path: string) {
    return items.value.some(item => item.path === path)
  }

  function firstPath() {
    return items.value[0]?.path || ''
  }

  return { items, loaded, source, load, reset, hasPath, firstPath }
})
