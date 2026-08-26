import { defineConfig, devices } from '@playwright/test'

const port = process.env.PORT ?? '3100'
const baseURL = `http://localhost:${port}`
const communityE2EEnabled = process.env.E2E_DF_COMMUNITY_SIGNUP
const isCommunityE2E = communityE2EEnabled !== undefined
const communityDepartment = process.env.E2E_DF_COMMUNITY_DEPARTMENT ?? 'DF'
const useExternalServer =
  process.env.E2E_DF_COMMUNITY_EXTERNAL_SERVER === 'true'

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
  ...(useExternalServer
    ? {}
    : {
        webServer: {
          command: 'pnpm run dev:e2e',
          url: baseURL,
          reuseExistingServer: !process.env.CI && !isCommunityE2E,
          timeout: 120_000,
          ...(isCommunityE2E
            ? {
                env: {
                  NEXT_PUBLIC_DEPARTMENT_NAME: communityDepartment,
                  NEXT_PUBLIC_ENABLE_DF_COMMUNITY_SIGNUP: communityE2EEnabled,
                },
              }
            : {}),
        },
      }),
})
