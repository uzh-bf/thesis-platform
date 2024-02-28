import { useSession } from 'next-auth/react'
import { UserRole } from '../constants'

function useUserRole() {
  const { data: session } = useSession()

  const isSupervisor = session?.user?.role === UserRole.SUPERVISOR
  const isDeveloper = session?.user?.role === UserRole.DEVELOPER
  const isStudent = !isSupervisor && !isDeveloper

  return {
    isSupervisor,
    isDeveloper,
    isStudent,
  }
}

export default useUserRole
