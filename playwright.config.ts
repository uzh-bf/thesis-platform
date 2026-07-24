import { defineConfig, devices } from '@playwright/test'

const port = process.env.PORT ?? '3100'
const baseURL = `http://localhost:${port}`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm run dev:e2e',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
