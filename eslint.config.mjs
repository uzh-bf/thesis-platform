import nextVitals from 'eslint-config-next/core-web-vitals'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
  ]),
])
