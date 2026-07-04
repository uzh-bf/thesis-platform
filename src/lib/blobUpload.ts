import { BlobServiceClient } from '@azure/storage-blob'

type BlobUploadInput = {
  file: Blob
  name: string
  sasString: string
  serviceUrl: string
  containerName: string
}

export const joinBlobServiceUrlAndSas = (
  serviceUrl: string,
  sasString: string
) => {
  const normalizedSas = sasString.startsWith('?')
    ? sasString.slice(1)
    : sasString

  if (normalizedSas === '') return serviceUrl
  if (serviceUrl.endsWith('?') || serviceUrl.endsWith('&')) {
    return `${serviceUrl}${normalizedSas}`
  }

  return `${serviceUrl}${serviceUrl.includes('?') ? '&' : '?'}${normalizedSas}`
}

export const uploadFileToBlob = async ({
  file,
  name,
  sasString,
  serviceUrl,
  containerName,
}: BlobUploadInput) => {
  const blobServiceClient = new BlobServiceClient(
    joinBlobServiceUrlAndSas(serviceUrl, sasString)
  )
  const containerClient = blobServiceClient.getContainerClient(containerName)
  const blockBlobClient = containerClient.getBlockBlobClient(name)

  return blockBlobClient.uploadData(file, {
    blockSize: 4 * 1024 * 1024,
  })
}
