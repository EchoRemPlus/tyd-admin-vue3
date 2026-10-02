<template>
  <div class="brand-mark" :style="{ width: size + 'px', height: size + 'px' }" aria-hidden="true">
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <!-- 定位针：对应扫码定位核验；针内对勾：对应巡检 / 工单闭环 -->
      <path d="M16 4.4c-4.77 0-8.64 3.83-8.64 8.55 0 6.16 8.64 14.65 8.64 14.65s8.64-8.49 8.64-14.65C24.64 8.23 20.77 4.4 16 4.4Z" fill="#fff" />
      <path d="M12.5 12.9l2.55 2.55 4.55-4.9" stroke="#0f766e" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 42 })
</script>

<style scoped>
.brand-mark {
  display: grid;
  place-items: center;
  flex: none;
  border-radius: 28%;
  background: linear-gradient(145deg, #2dd4bf 0%, #14b8a6 42%, #0f766e 100%);
  box-shadow: 0 6px 16px -7px rgba(15, 118, 110, .9), inset 0 1px 0 rgba(255, 255, 255, .28);
}
.brand-mark svg { display: block; width: 70%; height: 70%; }
</style>
