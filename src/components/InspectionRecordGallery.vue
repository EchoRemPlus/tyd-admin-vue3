<template>
  <div v-loading="loading" class="inspection-record-gallery">
    <el-empty v-if="!records.length" description="暂无巡检记录" :image-size="70" />
    <template v-else>
      <article v-for="(record, index) in records" :key="record.recordId" class="inspection-record-card">
        <header class="record-head">
          <div class="record-title">
            <span class="record-index">{{ index + 1 }}</span>
            <strong>{{ record.facilityName || '未知设施' }}</strong>
            <el-tag :type="record.hasIssue === '1' ? 'danger' : 'success'" size="small" effect="light">
              {{ record.hasIssue === '1' ? '发现异常' : '巡检正常' }}
            </el-tag>
          </div>
          <time>{{ formatTime(record.inspectionTime) }}</time>
        </header>

        <div class="record-meta">
          <span>{{ record.recordNo || '未生成编号' }}</span>
          <span>巡检人：{{ record.inspectorName || record.createByName || '-' }}</span>
          <span>扫码：{{ record.qrVerified === '1' ? '已通过' : '未校验' }}</span>
          <span>定位：{{ record.locationVerified === '1' ? '已通过' : '未校验' }}</span>
          <span v-if="record.locationDistance != null">距设施 {{ record.locationDistance }} 米</span>
        </div>

        <p class="record-description">{{ record.issueDesc || record.description || '无补充说明' }}</p>

        <div v-if="recordAttachments(record).length" class="record-attachments">
          <template v-for="(item, attachmentIndex) in recordAttachments(record)" :key="item.attachmentId || attachmentIndex">
            <el-image
              v-if="isImage(item)"
              class="record-image"
              :src="attachmentUrl(item)"
              :preview-src-list="imageUrls(record)"
              :initial-index="imageIndex(record, item)"
              fit="cover"
              preview-teleported
              hide-on-click-modal
            >
              <template #error>
                <div class="image-error"><el-icon><Picture /></el-icon><span>加载失败</span></div>
              </template>
            </el-image>
            <a v-else class="record-file" :href="attachmentUrl(item)" target="_blank" rel="noopener">
              <el-icon><Document /></el-icon>
              <span>{{ item.fileName || '查看附件' }}</span>
            </a>
          </template>
        </div>
        <div v-else class="empty-attachments">
          <el-icon><Picture /></el-icon>
          <span>本次巡检未上传图片或附件</span>
        </div>
      </article>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Document, Picture } from '@element-plus/icons-vue'
import { listAttachments, type Attachment, type InspectionRecord } from '@/api/system'
import { formatTime } from '@/utils/format'

const props = defineProps<{
  records: InspectionRecord[]
}>()

const loading = ref(false)
const attachments = ref<Record<number, Attachment[]>>({})
let requestVersion = 0

watch(
  () => props.records,
  records => loadAttachments(records || []),
  { immediate: true }
)

async function loadAttachments(records: InspectionRecord[]) {
  const version = ++requestVersion
  const recordIds = records.map(item => item.recordId).filter((id): id is number => Boolean(id))
  if (!recordIds.length) {
    attachments.value = {}
    loading.value = false
    return
  }

  loading.value = true
  try {
    const results = await Promise.all(recordIds.map(async recordId => {
      try {
        const result: any = await listAttachments('inspection_record', recordId)
        return [recordId, Array.isArray(result.data) ? result.data : []] as const
      } catch {
        return [recordId, []] as const
      }
    }))
    if (version === requestVersion) {
      attachments.value = Object.fromEntries(results)
    }
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

function recordAttachments(record: InspectionRecord) {
  return record.recordId ? attachments.value[record.recordId] || [] : []
}

function isImage(item: Attachment) {
  if ((item.fileType || '').toLowerCase().startsWith('image/')) return true
  return /\.(jpe?g|png|gif|webp|bmp)$/i.test(item.fileName || item.fileUrl || item.filePath || '')
}

function imageUrls(record: InspectionRecord) {
  return recordAttachments(record).filter(isImage).map(attachmentUrl)
}

function imageIndex(record: InspectionRecord, target: Attachment) {
  return imageUrls(record).indexOf(attachmentUrl(target))
}

/**
 * 优先按后端返回的相对存储路径拼当前环境地址，避免历史数据里写死的局域网 IP 换网络后失效。
 */
function attachmentUrl(item: Attachment) {
  const base = String(import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '')
  if (item.filePath) {
    if (/^https?:\/\//i.test(item.filePath)) return item.filePath
    const path = item.filePath.startsWith('/') ? item.filePath : `/${item.filePath}`
    return `${base}${path}`
  }
  return item.fileUrl || ''
}
</script>

<style scoped>
.inspection-record-gallery { display: flex; flex-direction: column; gap: 12px; min-height: 80px; }
.inspection-record-card { padding: 14px; border: 1px solid var(--ops-border, #e2e8f0); border-radius: 12px; background: linear-gradient(180deg, #fff 0%, #fbfdfc 100%); box-shadow: 0 2px 8px rgba(15, 64, 58, 0.04); }
.record-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.record-title { display: flex; align-items: center; gap: 8px; min-width: 0; }
.record-title strong { overflow: hidden; color: #1e293b; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.record-index { display: inline-flex; flex: 0 0 24px; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 8px; background: #e8f4f2; color: var(--ops-primary, #0f766e); font-size: 12px; font-weight: 700; }
.record-head time { flex: 0 0 auto; color: var(--ops-muted, #64748b); font-size: 12px; }
.record-meta { display: flex; flex-wrap: wrap; gap: 6px 12px; margin-top: 10px; color: #64748b; font-size: 12px; }
.record-meta span { position: relative; }
.record-meta span:not(:last-child)::after { position: absolute; top: 50%; right: -7px; width: 2px; height: 2px; border-radius: 50%; background: #cbd5e1; content: ''; }
.record-description { margin: 10px 0 0; padding: 9px 11px; border-radius: 8px; background: #f8fafc; color: #475569; font-size: 12px; line-height: 1.65; }
.record-attachments { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 8px; margin-top: 12px; }
.record-image { width: 100%; height: 104px; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 9px; background: #f1f5f9; cursor: zoom-in; }
.image-error { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; height: 100%; color: #94a3b8; font-size: 11px; }
.record-file { display: flex; grid-column: span 2; align-items: center; gap: 7px; min-width: 0; padding: 10px 11px; border: 1px solid #e2e8f0; border-radius: 9px; color: #0f766e; background: #f8fafc; font-size: 12px; text-decoration: none; }
.record-file span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty-attachments { display: flex; align-items: center; justify-content: center; gap: 7px; margin-top: 12px; padding: 11px; border: 1px dashed #dbe4e9; border-radius: 9px; color: #94a3b8; background: #fbfdff; font-size: 12px; }
</style>
