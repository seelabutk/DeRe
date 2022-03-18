import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: '',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '/src'),
      'vue': 'vue/dist/vue.esm-bundler.js',

      //for gridstack jQuery
      'jquery': 'gridstack/dist/jq/jquery.js',
      'jquery-ui': 'gridstack/dist/jq/jquery-ui.js',
      'jquery.ui': 'gridstack/dist/jq/jquery-ui.js',
      'jquery.ui.touch-punch': 'gridstack/dist/jq/jquery.ui.touch-punch.js',
    },
  },
})
