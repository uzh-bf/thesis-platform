import { useSession } from 'next-auth/react'
import { UserRole } from '../constants'

function useUserRole() {
  const { data: session } = useSession()

  const isSupervisor = session?.user?.role === UserRole.SUPERVISOR
  const isDeveloper = session?.user?.role === UserRole.DEVELOPER
  const isAdmin = session?.user?.isAdmin === true
  const isStudent = !isSupervisor && !isDeveloper

  return {
    isSupervisor,
    isDeveloper,
    isAdmin,
    isStudent,
  }
}

export default useUserRole
