import { BlobServiceClient } from '@azure/storage-blob'

const defaultConnectionString =
  'DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=' +
  'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;' +
  'BlobEndpoint=http://127.0.0.1:11000/devstoreaccount1;'

const connectionString =
  process.env.AZURITE_STORAGE_CONNECTION_STRING ??
  process.env.AZURE_STORAGE_CONNECTION_STRING ??
  defaultConnectionString

const containerName = process.env.NEXT_PUBLIC_CONTAINER_NAME ?? 'uploads'
const corsAllowedOrigins =
  process.env.AZURITE_CORS_ALLOWED_ORIGINS ??
  [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3100',
    'http://127.0.0.1:3100',
  ].join(',')

async function main() {
  const blobServiceClient =
    BlobServiceClient.fromConnectionString(connectionString)
  const containerClient = blobServiceClient.getContainerClient(containerName)

  await containerClient.createIfNotExists()
  await blobServiceClient.setProperties({
    cors: [
      {
        allowedOrigins: corsAllowedOrigins,
        allowedMethods: 'GET,HEAD,PUT,OPTIONS',
        allowedHeaders: 'x-ms-*,content-type,accept,origin,if-none-match',
        exposedHeaders: 'x-ms-*,etag',
        maxAgeInSeconds: 3600,
      },
    ],
  })

  console.log(`Azurite container ready: ${containerName}`)
  console.log(`Azurite CORS origins: ${corsAllowedOrigins}`)
}

main().catch((error) => {
  console.error('Failed to prepare Azurite container.')
  console.error(error)
  process.exitCode = 1
})
