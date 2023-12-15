import { useSession } from 'next-auth/react'
import { UserRole } from '../constants'

function useUserRole() {
  const { data: session } = useSession()

  const isAdmin = session?.user?.role === UserRole.ADMIN
  const isSupervisor = session?.user?.role === UserRole.SUPERVISOR
  const isDeveloper = session?.user?.role === UserRole.DEVELOPER
  const isStudent = !isAdmin && !isSupervisor && !isDeveloper

  return {
    isAdmin,
    isSupervisor,
    isDeveloper,
    isStudent,
  }
}

export default useUserRole
