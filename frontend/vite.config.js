// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    // Only use HTTPS in development if cert files exist
    ...(fs.existsSync(path.resolve(__dirname, 'localhost+2-key.pem')) && 
        fs.existsSync(path.resolve(__dirname, 'localhost+2.pem')) ? {
      https: {
        key: fs.readFileSync(path.resolve(__dirname, 'localhost+2-key.pem')),
        cert: fs.readFileSync(path.resolve(__dirname, 'localhost+2.pem')),
      },
    } : {}),
    host: 'localhost',
    port: 5174,
  },
})
