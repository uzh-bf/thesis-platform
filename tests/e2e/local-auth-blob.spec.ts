import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from '@azure/storage-blob'
import { expect, test } from '@playwright/test'

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing ${name}. Run this test through pnpm run test:e2e.`)
  }

  return value
}

const azuriteAccountName = requireEnv('NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT_NAME')
const azuriteAccountKey = requireEnv('AZURE_STORAGE_ACCOUNT_ACCESS_KEY')
const blobServiceUrl = requireEnv('NEXT_PUBLIC_BLOBSERVICECLIENT_URL').replace(
  /[?&]$/,
  ''
)
const containerName = requireEnv('NEXT_PUBLIC_CONTAINER_NAME')
const serviceClient = new BlobServiceClient(
  blobServiceUrl,
  new StorageSharedKeyCredential(azuriteAccountName, azuriteAccountKey)
)
const containerClient = serviceClient.getContainerClient(containerName)

async function blobExists(name: string) {
  return containerClient.getBlobClient(name).exists()
}

test('OpenAPI healthcheck, local OIDC, and browser PUT to Azurite work locally', async ({
  page,
}) => {
  const healthcheckResponse = await page.request.get('/api/healthcheck')
  expect(healthcheckResponse.ok()).toBe(true)
  await expect(healthcheckResponse.text()).resolves.toContain('OK')

  await page.goto('/api/auth/signin')
  await page.getByRole('button', { name: 'Sign in with Local OIDC' }).click()
  await page.waitForURL('**/')

  const session = await page.evaluate(async () =>
    fetch('/api/auth/session').then((response) => response.json())
  )

  expect(session.user).toMatchObject({
    email: 'admin@example.com',
    role: 'DEVELOPER',
    isAdmin: true,
  })

  const uploadResult = await page.evaluate(async () => {
    const sasResponse = await fetch('/api/trpc/generateSasQueryToken?batch=1', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ 0: { json: null } }),
    })

    if (!sasResponse.ok) {
      throw new Error(`SAS request failed with HTTP ${sasResponse.status}`)
    }

    const [{ result }] = await sasResponse.json()
    if (
      !result?.data?.containerName ||
      !result.data.sasString ||
      !result.data.serviceUrl
    ) {
      throw new Error('SAS response did not include upload fields')
    }

    const { containerName, sasString, serviceUrl } = result.data
    const name = `e2e-browser-${Date.now()}.pdf`
    const baseUrl = serviceUrl.replace(/[?&]$/, '')
    const response = await fetch(
      `${baseUrl}/${containerName}/${name}?${sasString}`,
      {
        method: 'PUT',
        headers: {
          'content-type': 'application/pdf',
          'x-ms-blob-type': 'BlockBlob',
          'x-ms-version': '2023-01-03',
        },
        body: new Blob(['%PDF-1.4\n% e2e upload\n%%EOF'], {
          type: 'application/pdf',
        }),
      }
    )

    return { name, ok: response.ok, status: response.status }
  })

  expect(uploadResult).toMatchObject({ ok: true, status: 201 })
  await expect.poll(() => blobExists(uploadResult.name)).toBe(true)
})
