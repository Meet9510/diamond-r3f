import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    base: './',
    plugins: [react()],
    resolve: {
        alias: {
            'three': path.resolve(__dirname, 'node_modules/three')
        }
    },
    server: {
        port: 5174,
        fs: {
            allow: ['..']
        }
    }
})
