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

test('OpenAPI healthcheck, local OIDC admin UI, and browser PUT to Azurite work locally', async ({
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

  await expect(page.getByText('Thesis Market')).toBeVisible()
  const adminButton = page.getByRole('button', { name: 'Admin', exact: true })
  await expect(adminButton).toBeVisible()

  // The overview auto-selects the first proposal after data loads, so direct
  // navigation keeps this smoke stable while still proving the Admin entrypoint.
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin/)
  await expect(page.getByRole('tab', { name: 'Proposals' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Admin Info' })).toBeVisible()

  const uploadResult = await page.evaluate(async () => {
    const file = new Blob(['%PDF-1.4\n% e2e upload\n%%EOF'], {
      type: 'application/pdf',
    })
    const sasResponse = await fetch('/api/trpc/generateSasQueryToken?batch=1', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        0: {
          requestedFileName: 'e2e-browser.pdf',
          contentType: 'application/pdf',
          size: file.size,
          purpose: 'application-cv',
        },
      }),
    })

    if (!sasResponse.ok) {
      const body = await sasResponse.text()
      throw new Error(
        `SAS request failed with HTTP ${sasResponse.status}: ${body}`
      )
    }

    const [{ result }] = await sasResponse.json()
    if (!result?.data?.blobName || !result.data.uploadUrl) {
      throw new Error('SAS response did not include upload fields')
    }

    const { blobName, uploadUrl } = result.data
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'content-type': 'application/pdf',
        'if-none-match': '*',
        'x-ms-blob-type': 'BlockBlob',
        'x-ms-version': '2023-01-03',
      },
      body: file,
    })

    return { name: blobName, ok: response.ok, status: response.status }
  })

  expect(uploadResult).toMatchObject({ ok: true, status: 201 })
  await expect.poll(() => blobExists(uploadResult.name)).toBe(true)
})
