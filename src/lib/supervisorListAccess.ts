import { UserRole } from 'src/lib/constants'

// Developers always see the Supervisors list. Admins see it only once a
// developer granted them access; the grant has no effect without an admin
// role since only admins can open the admin panel.
export function canViewSupervisorList(user: {
  role: string
  adminRole: string
  supervisorListAccess: boolean
}) {
  if (user.role === UserRole.DEVELOPER) return true
  return user.adminRole !== 'UNSET' && user.supervisorListAccess
}
