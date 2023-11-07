import { useSession } from 'next-auth/react'
import { UserRole } from '../constants'

function useUserRole() {
  const { data: session } = useSession()

  const isAdmin = session?.user?.role === UserRole.ADMIN
  const isSupervisor = session?.user?.role === UserRole.SUPERVISOR
  const isStudent = !isAdmin && !isSupervisor

  return {
    isAdmin,
    isSupervisor,
    isStudent,
  }
}

export default useUserRole
