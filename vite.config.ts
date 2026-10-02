import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      port: 8090,
      host: '0.0.0.0',
      proxy: {
        '/dev-api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:8081',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/dev-api/, '')
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: {
            vue: ['vue', 'vue-router', 'pinia'],
            element: ['element-plus', '@element-plus/icons-vue'],
            charts: ['echarts'],
            http: ['axios', 'dayjs']
          }
        }
      }
    }
  }
})
