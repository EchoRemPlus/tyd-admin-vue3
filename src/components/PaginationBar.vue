<template>
  <div class="pagination-bar">
    <el-pagination
      background
      layout="total, sizes, prev, pager, next"
      :total="total"
      :page-size="pageSize"
      :current-page="page"
      :page-sizes="pageSizes"
      @update:current-page="onPageChange"
      @update:page-size="onSizeChange"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 通用分页条。
 *
 * 统一列表页的分页交互：切换页码或每页条数后触发 change 事件，由页面重新加载数据。
 */
const props = withDefaults(defineProps<{
  total: number
  page: number
  pageSize: number
  pageSizes?: number[]
}>(), {
  pageSizes: () => [10, 20, 50, 100]
})

const emit = defineEmits<{
  (e: 'update:page', value: number): void
  (e: 'update:pageSize', value: number): void
  (e: 'change'): void
}>()

function onPageChange(value: number) {
  emit('update:page', value)
  emit('change')
}

function onSizeChange(value: number) {
  emit('update:pageSize', value)
  emit('update:page', 1)
  emit('change')
}
</script>

<style scoped>
.pagination-bar { display: flex; justify-content: flex-end; padding: 16px 18px; }
</style>