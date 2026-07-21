import { v4 as uuidv4 } from 'uuid'

export type ApplicationUploadDocumentType = 'cv' | 'transcript'

export function createApplicationUploadBlobName(
  proposalId: string,
  documentType: ApplicationUploadDocumentType
) {
  return `${proposalId}-${uuidv4()}-${documentType}.pdf`
}
