<template>
  <div class="login-page">
    <section class="login-story">
      <span class="glow" aria-hidden="true"></span>
      <div class="story-inner">
        <div class="brand">
          <BrandMark :size="44" />
          <div><strong>景区设施运维中枢</strong><span>Scenic Operations Console</span></div>
        </div>
        <h1>景区设施巡检报修系统</h1>
        <p>把巡检、派单、接单、维修和审计串成一条可追踪的运维闭环。</p>
      </div>
    </section>

    <section class="login-panel">
      <div class="login-card">
        <div class="login-head">
          <span>运维管理端</span>
          <h2>欢迎登录</h2>
          <p>使用系统管理员或有管理权限的账号</p>
        </div>
        <el-form :model="form" label-position="top" @keyup.enter="submit">
          <el-form-item label="账号"><el-input v-model="form.username" size="large" placeholder="请输入账号" :prefix-icon="User" /></el-form-item>
          <el-form-item label="密码"><el-input v-model="form.password" type="password" show-password size="large" placeholder="请输入密码" :prefix-icon="Lock" /></el-form-item>
          <el-form-item v-if="captchaEnabled" label="验证码">
            <div class="captcha-row"><el-input v-model="form.code" size="large" placeholder="验证码" /><img :src="captchaImg" alt="验证码" @click="loadCaptcha" /></div>
          </el-form-item>
          <el-button type="primary" size="large" class="login-button" :loading="loading" @click="submit">进入运维中枢</el-button>
        </el-form>
        <div class="login-tip">默认账号：admin / admin123</div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Lock, User } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import BrandMark from '@/components/BrandMark.vue'
import { getCaptcha } from '@/api/system'
import { useAuthStore } from '@/stores/auth'
import { useMenuStore } from '@/stores/menu'

const auth = useAuthStore()
const menuStore = useMenuStore()
const route = useRoute()
const router = useRouter()
const loading = ref(false)
const captchaEnabled = ref(true)
const captchaImg = ref('')
const form = reactive({ username: 'admin', password: 'admin123', code: '', uuid: '' })

async function loadCaptcha() {
  try {
    const result: any = await getCaptcha()
    captchaEnabled.value = result.captchaEnabled !== false
    captchaImg.value = result.img ? `data:image/gif;base64,` + result.img : ''
    form.uuid = result.uuid || ''
    form.code = ''
  } catch {
    captchaEnabled.value = false
  }
}

async function submit() {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入账号和密码')
    return
  }
  loading.value = true
  try {
    await auth.login({ ...form })
    menuStore.reset()
    await menuStore.load()
    const requested = String(route.query.redirect || '')
    const requestedPath = requested.split('?')[0]
    const target = requestedPath && menuStore.hasPath(requestedPath) ? requested : menuStore.firstPath()
    router.replace(target || '/403')
  } catch {
    await loadCaptcha()
  } finally {
    loading.value = false
  }
}

onMounted(loadCaptcha)
</script>

<style scoped>
/* 左侧品牌区沿用侧边栏的深绿渐变，右侧沿用系统浅灰底 + 白色面板，保持与后台一致 */
.login-page { min-height: 100vh; display: grid; grid-template-columns: minmax(420px, 1.05fr) minmax(420px, .95fr); background: #f8fafc; }
.login-story { position: relative; display: flex; flex-direction: column; justify-content: center; overflow: hidden; padding: 72px 6vw; color: #f8fafc; background: linear-gradient(165deg, #0f172a 0%, #134e4a 62%, #0f766e 100%); }
.login-story::after { content: ""; position: absolute; right: -140px; bottom: -170px; width: 420px; height: 420px; border: 1px solid rgba(255,255,255,.16); border-radius: 50%; box-shadow: 0 0 0 70px rgba(255,255,255,.03), 0 0 0 140px rgba(255,255,255,.02); }
.glow { position: absolute; top: -24%; left: -14%; width: 76%; height: 70%; border-radius: 50%; background: radial-gradient(circle, rgba(45,212,191,.3), transparent 66%); animation: glow-drift 18s ease-in-out infinite; }
@keyframes glow-drift { 0%, 100% { transform: translate3d(0, 0, 0) scale(1); } 50% { transform: translate3d(48px, 32px, 0) scale(1.08); } }
.story-inner { position: relative; z-index: 1; animation: fade-up .6s ease both; }
.brand { display: flex; gap: 12px; align-items: center; }
.brand strong { display: block; font-size: 15px; }
.brand span { display: block; margin-top: 3px; color: #94a3b8; font-size: 10px; letter-spacing: .06em; text-transform: uppercase; }
.login-story h1 { max-width: 660px; margin: 40px 0 16px; font-size: 40px; line-height: 1.24; }
.login-story p { max-width: 560px; margin: 0; color: #cbd5e1; font-size: 15px; line-height: 1.9; }

.login-panel { display: grid; place-items: center; padding: 42px; }
.login-card { width: min(424px, 100%); padding: 36px 36px 30px; border-radius: 16px; background: #fff; border: 1px solid var(--ops-border); box-shadow: 0 22px 60px -18px rgba(15,23,42,.3); animation: card-in .6s cubic-bezier(.22,.85,.3,1) both; }
@keyframes card-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
.login-head span { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #e8f1f0; color: var(--ops-primary); font-size: 12px; letter-spacing: .06em; }
.login-head h2 { margin: 12px 0 6px; font-size: 28px; }
.login-head p { margin: 0 0 26px; color: var(--ops-muted); font-size: 13px; }

.login-card :deep(.el-form-item) { margin-bottom: 18px; }
.login-card :deep(.el-form-item__label) { color: #475569; font-weight: 600; padding-bottom: 6px; }
.login-card :deep(.el-input__wrapper) { border-radius: 10px; transition: box-shadow .2s ease; }
.login-card :deep(.el-input__wrapper.is-focus) { box-shadow: 0 0 0 1px var(--ops-primary) inset, 0 0 0 3px rgba(15, 118, 110, .12); }

.captcha-row { display: flex; width: 100%; gap: 10px; }
.captcha-row img { width: 122px; height: 40px; border-radius: 8px; cursor: pointer; background: #eef2f7; }

.login-button { width: 100%; height: 46px; margin-top: 8px; border: none; border-radius: 10px; font-size: 15px; letter-spacing: .04em; background: linear-gradient(180deg, var(--ops-primary) 0%, #14b8a6 100%); box-shadow: 0 10px 22px -10px rgba(15,118,110,.7); transition: filter .2s ease, transform .2s ease, box-shadow .2s ease; }
.login-button:hover { filter: brightness(1.06); transform: translateY(-1px); box-shadow: 0 14px 26px -10px rgba(15,118,110,.75); }
.login-tip { margin-top: 20px; padding-top: 16px; border-top: 1px dashed #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; }

@keyframes fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 960px) {
  .login-page { grid-template-columns: 1fr; }
  .login-story { padding: 44px 24px 28px; text-align: left; }
  .login-story h1 { margin: 26px 0 12px; font-size: 28px; }
  .login-story p { font-size: 14px; }
  .login-story::after { display: none; }
  .login-panel { padding: 8px 20px 40px; }
}
@media (max-width: 560px) {
  .login-card { padding: 28px 22px 24px; border-radius: 14px; }
  .login-head h2 { font-size: 24px; }
}

@media (prefers-reduced-motion: reduce) {
  .glow { animation: none !important; }
  .story-inner, .login-card { animation: none !important; }
  .login-button { transition: none !important; }
}
</style>
