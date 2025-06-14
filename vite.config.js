import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Fix for lodash imports in @ant-design/charts
      'lodash': 'lodash-es',
    },
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
        modifyVars: {
          // Override Ant Design Less variables if needed
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      '@ant-design/icons',
      '@ant-design/pro-components',
      '@ant-design/charts',
      'lodash',
      'lodash-es',
    ],
    exclude: ['@arcgis/core'],
  },
  server: {
    port: 3000,
    open: true,
  },
});