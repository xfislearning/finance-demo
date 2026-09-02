import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
  return {
    plugins: [react()],
    base: process.env.GITHUB_ACTIONS && repo ? `/${repo}/` : '/',
  }
})
