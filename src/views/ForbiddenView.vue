<template>
  <div class="forbidden-page">
    <section class="forbidden-card">
      <div class="code">403</div>
      <h1>{{ emptyAccess ? '当前账号暂无管理端权限' : '没有访问该页面的权限' }}</h1>
      <p v-if="emptyAccess">账号已正常登录，但没有分配到任何可用的管理端菜单，请联系管理员授权。</p>
      <p v-else>你仍可使用左侧有权限的菜单，无需退出当前账号。</p>
      <div class="account" v-if="auth.user">
        <span>当前账号</span>
        <strong>{{ auth.user.nickName || auth.user.userName }}</strong>
      </div>
      <div class="actions">
        <el-button v-if="menuStore.firstPath()" type="primary" @click="goAccessible">返回可用页面</el-button>
        <el-button @click="logout">退出登录</el-button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMenuStore } from '@/stores/menu'

const auth = useAuthStore()
const menuStore = useMenuStore()
const router = useRouter()
const emptyAccess = computed(() => menuStore.items.length === 0)

function goAccessible() {
  const path = menuStore.firstPath()
  if (path) router.replace(path)
}

async function logout() {
  await auth.logout()
  menuStore.reset()
  router.replace('/login')
}
</script>

<style scoped>
.forbidden-page { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #f8fafc; }
.forbidden-card { width: min(520px, 100%); padding: 42px; border: 1px solid var(--ops-border); border-radius: 18px; background: #fff; box-shadow: 0 24px 60px -24px rgba(15,23,42,.28); text-align: center; }
.code { display: inline-grid; place-items: center; width: 82px; height: 82px; margin-bottom: 20px; border-radius: 22px; color: #0f766e; background: #e8f1f0; font-size: 26px; font-weight: 800; letter-spacing: .04em; }
h1 { margin: 0 0 12px; color: #0f172a; font-size: 24px; }
p { margin: 0; color: #64748b; font-size: 14px; line-height: 1.8; }
.account { display: flex; justify-content: center; gap: 10px; margin-top: 24px; padding: 12px; border-radius: 10px; color: #475569; background: #f8fafc; font-size: 13px; }
.account strong { color: #0f172a; }
.actions { display: flex; justify-content: center; gap: 12px; margin-top: 26px; }
</style>
