<template>
  <div class="attachment-upload">
    <div class="upload-actions">
      <el-button size="small" :loading="uploading" @click="pickFiles">选择文件上传</el-button>
      <span class="upload-hint">支持 JPG/PNG/WEBP/GIF/PDF，单个不超过 {{ maxFileSizeMb }}MB，单次最多 {{ maxFiles }} 个</span>
    </div>
    <div v-if="errorMessage" class="upload-error">
      <span>{{ errorMessage }}</span>
      <el-button link type="primary" @click="retry">重试</el-button>
    </div>
    <input ref="inputRef" type="file" multiple accept="image/*,application/pdf" class="hidden-input" @change="onFilesPicked" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { TOKEN_KEY } from '@/api/http'

/**
 * 通用附件上传组件。
 *
 * 复用后端的批量上传接口，上传前在浏览器侧先做体积与类型校验，
 * 失败时保留待上传文件，可点击"重试"重新提交，避免弱网环境下重新选择文件。
 */
const props = withDefaults(defineProps<{
  relatedType: string
  relatedId: number
  maxFileSizeMb?: number
  maxFiles?: number
}>(), {
  maxFileSizeMb: 10,
  maxFiles: 9
})

const emit = defineEmits<{ (e: 'uploaded'): void }>()

const inputRef = ref<HTMLInputElement>()
const uploading = ref(false)
const errorMessage = ref('')
let pending: File[] = []

function pickFiles() {
  inputRef.value?.click()
}

function onFilesPicked(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length) return
  pending = files
  errorMessage.value = ''
  upload()
}

function validate(files: File[]): string {
  if (files.length > props.maxFiles) return `单次最多上传 ${props.maxFiles} 个附件`
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
  for (const file of files) {
    if (file.size > props.maxFileSizeMb * 1024 * 1024) return `「${file.name}」超过 ${props.maxFileSizeMb}MB`
    if (file.type && !allowed.includes(file.type)) return `「${file.name}」类型不支持，仅允许图片或 PDF`
  }
  return ''
}

async function upload() {
  const invalid = validate(pending)
  if (invalid) {
    errorMessage.value = invalid
    return
  }
  uploading.value = true
  errorMessage.value = ''
  try {
    const form = new FormData()
    pending.forEach(file => form.append('files', file))
    form.append('relatedType', props.relatedType)
    form.append('relatedId', String(props.relatedId))
    const token = localStorage.getItem(TOKEN_KEY)
    const response = await fetch(`${import.meta.env.VITE_API_BASE}/system/attachment/batchUpload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form
    })
    const payload = await response.json()
    if (!response.ok || payload.code !== 200) {
      throw new Error(payload.msg || `上传失败（${response.status}）`)
    }
    ElMessage.success(`已上传 ${pending.length} 个附件`)
    pending = []
    emit('uploaded')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '上传失败'
  } finally {
    uploading.value = false
  }
}

function retry() {
  if (pending.length) upload()
}
</script>

<style scoped>
.attachment-upload { display: flex; flex-direction: column; gap: 8px; }
.upload-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.upload-hint { color: var(--ops-muted); font-size: 11px; }
.upload-error { display: flex; align-items: center; gap: 10px; color: #ef4444; font-size: 12px; }
.hidden-input { display: none; }
</style>