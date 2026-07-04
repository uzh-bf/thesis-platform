import { BlockBlobClient } from '@azure/storage-blob'

type BlobUploadInput = {
  file: Blob
  uploadUrl: string
}

export const uploadFileToBlob = async ({
  file,
  uploadUrl,
}: BlobUploadInput) => {
  const blockBlobClient = new BlockBlobClient(uploadUrl)

  return blockBlobClient.uploadData(file, {
    blockSize: 4 * 1024 * 1024,
    blobHTTPHeaders: {
      blobContentType: file.type || 'application/pdf',
    },
    conditions: {
      ifNoneMatch: '*',
    },
  })
}
