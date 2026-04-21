import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://37.27.220.44',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: false,
        timeout: 60000,
        proxyTimeout: 60000,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('Vite Proxy Error:', err.message);
          });
        },
      },
    }
  }
})
