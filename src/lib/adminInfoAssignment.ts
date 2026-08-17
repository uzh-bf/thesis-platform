export type AdminInfoAssignmentInput = {
  adminRole?: string | null
  responsibleId?: string
  supervisorEmail?: string
}

export type AdminInfoAssignment = {
  responsibleId: string
  supervisorEmail: string
}

export class AdminInfoAssignmentPolicyError extends Error {
  constructor(
    public readonly code: 'BAD_REQUEST' | 'FORBIDDEN',
    message: string
  ) {
    super(message)
    this.name = 'AdminInfoAssignmentPolicyError'
  }
}

export function resolveAdminInfoAssignment({
  adminRole,
  responsibleId,
  supervisorEmail,
}: AdminInfoAssignmentInput): AdminInfoAssignment | null {
  const hasResponsibleId = responsibleId !== undefined
  const hasSupervisorEmail = supervisorEmail !== undefined

  if (!hasResponsibleId && !hasSupervisorEmail) {
    return null
  }

  if (adminRole !== 'ADMIN') {
    throw new AdminInfoAssignmentPolicyError(
      'FORBIDDEN',
      'Full admin role required to change Professor or Supervisor.'
    )
  }

  if (!hasResponsibleId || !hasSupervisorEmail) {
    throw new AdminInfoAssignmentPolicyError(
      'BAD_REQUEST',
      'Professor and Supervisor must be changed together.'
    )
  }

  return {
    responsibleId,
    supervisorEmail,
  }
}
