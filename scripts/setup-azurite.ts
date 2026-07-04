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

async function main() {
  const blobServiceClient =
    BlobServiceClient.fromConnectionString(connectionString)
  const containerClient = blobServiceClient.getContainerClient(containerName)

  await containerClient.createIfNotExists()

  console.log(`Azurite container ready: ${containerName}`)
}

main().catch((error) => {
  console.error('Failed to prepare Azurite container.')
  console.error(error)
  process.exitCode = 1
})
