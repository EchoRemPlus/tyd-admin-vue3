<template>
  <el-tag :type="tagType" :effect="effect" round>{{ label }}</el-tag>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { listSysDictData, type SysDictData } from '@/api/systemManage'

/**
 * 字典标签组件。
 *
 * 按字典类型与字典值渲染带样式的标签，字典不可用时回退显示原始值，避免页面出现空白。
 */
const props = withDefaults(defineProps<{
  dictType: string
  value?: string | number
  effect?: 'light' | 'dark' | 'plain'
}>(), {
  effect: 'light'
})

const cache = new Map<string, SysDictData[]>()
const options = ref<SysDictData[]>([])

const matched = computed(() => options.value.find(item => String(item.dictValue) === String(props.value)))
const label = computed(() => matched.value?.dictLabel || (props.value != null && props.value !== '' ? String(props.value) : '-'))
const tagType = computed(() => {
  const style = matched.value?.listClass
  const allowed = ['primary', 'success', 'info', 'warning', 'danger']
  return style && allowed.includes(style) ? (style as any) : undefined
})

async function load() {
  if (cache.has(props.dictType)) {
    options.value = cache.get(props.dictType)!
    return
  }
  try {
    const result: any = await listSysDictData({ dictType: props.dictType, pageNum: 1, pageSize: 200 })
    const rows = result.rows || []
    cache.set(props.dictType, rows)
    options.value = rows
  } catch {
    options.value = []
  }
}

onMounted(load)
</script>