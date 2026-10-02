<template>
  <el-select
    :model-value="modelValue"
    :placeholder="placeholder"
    :clearable="clearable"
    :disabled="disabled"
    :multiple="multiple"
    :style="{ width: '100%' }"
    @update:model-value="onChange"
  >
    <el-option v-for="item in options" :key="item.dictValue" :label="item.dictLabel" :value="item.dictValue" />
  </el-select>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listSysDictData, type SysDictData } from '@/api/systemManage'

/**
 * 字典下拉组件。
 *
 * 按字典类型从后端加载字典数据，同一类型在一次会话内只请求一次，避免各页面重复硬编码选项。
 */
const props = withDefaults(defineProps<{
  modelValue?: any
  dictType: string
  placeholder?: string
  clearable?: boolean
  disabled?: boolean
  multiple?: boolean
}>(), {
  placeholder: '请选择',
  clearable: true,
  disabled: false,
  multiple: false
})

const emit = defineEmits<{ (e: 'update:modelValue', value: any): void }>()

/** 字典缓存，key 为字典类型 */
const cache = new Map<string, SysDictData[]>()
const options = ref<SysDictData[]>([])

async function load() {
  if (cache.has(props.dictType)) {
    options.value = cache.get(props.dictType)!
    return
  }
  try {
    const result: any = await listSysDictData({ dictType: props.dictType, pageNum: 1, pageSize: 200, status: '0' })
    const rows = (result.rows || []).sort((a: SysDictData, b: SysDictData) => (a.dictSort || 0) - (b.dictSort || 0))
    cache.set(props.dictType, rows)
    options.value = rows
  } catch {
    options.value = []
  }
}

function onChange(value: any) {
  emit('update:modelValue', value)
}

onMounted(load)
</script>