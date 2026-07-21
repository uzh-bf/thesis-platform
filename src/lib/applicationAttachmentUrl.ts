export function getApplicationAttachmentUrl(
  proposalId: string,
  attachmentId: string
) {
  return `/api/proposals/${encodeURIComponent(
    proposalId
  )}/application-attachments/${encodeURIComponent(attachmentId)}`
}
