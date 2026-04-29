import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'node:child_process'

function resolveSha(): string {
  const fromEnv = process.env.GITHUB_SHA
  if (fromEnv && fromEnv.length >= 7) return fromEnv.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return 'dev'
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/TokyoFlagsQuizz/',
  define: {
    __APP_SHA__: JSON.stringify(resolveSha()),
  },
})
