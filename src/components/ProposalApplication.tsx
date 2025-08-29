import { H2, Table } from '@uzh-bf/design-system'
import { add, format, parseISO } from 'date-fns'
import { useSession } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import useUserRole from 'src/lib/hooks/useUserRole'
import { trpc } from 'src/lib/trpc'
import { ApplicationDetails, ProposalDetails } from 'src/types/app'
import ApplicationDetailsModal from './ApplicationDetailsModal'
import ApplicationForm from './ApplicationForm'
import ConfirmationModal from './ConfirmationModal'

interface ProposalApplicationProps {
  proposalDetails: ProposalDetails
  refetch: () => void
  setFilters: (filters: { status: string }) => void
}

export default function ProposalApplication({
  proposalDetails,
  refetch,
  setFilters,
}: ProposalApplicationProps) {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(true)
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] =
    useState<boolean>(false)
  const [showIndicators, setShowIndicators] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // Handle scroll indicators - only hide on scroll
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return
    
    // Hide indicators on scroll
    const handleScroll = () => setShowIndicators(false)
    scrollContainer.addEventListener('scroll', handleScroll)
    
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const { data: session } = useSession()
  const { isStudent, isSupervisor, isDeveloper } = useUserRole()
  const acceptApplication = trpc.acceptProposalApplication.useMutation()
  if (proposalDetails?.typeKey === 'SUPERVISOR') {
    return (
      <div className="p-4">
        {isStudent && (
          <ApplicationForm
            key={proposalDetails.id}
            proposalName={proposalDetails.title}
            proposalId={proposalDetails.id}
          />
        )}
        {isDeveloper ||
        (isSupervisor &&
          (session?.user?.email === proposalDetails?.ownedByUserEmail ||
            session?.user.email ===
              proposalDetails?.supervisedBy?.[0].supervisorEmail)) ? (
          <div className="pt-4">
            <H2>Applications</H2>
            {proposalDetails?.applications?.length === 0 &&
              'No applications for this proposal...'}
            {proposalDetails?.applications?.length > 0 && (
              <div ref={scrollContainerRef} className="overflow-x-auto relative group">
                {showIndicators && (
                  <>
                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 bg-blue-600 text-white w-7 h-7 flex items-center justify-center rounded-full shadow-lg transition-opacity duration-500 opacity-90 z-10 animate-pulse">
                      <span className="text-lg font-bold">→</span>
                    </div>
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 bg-blue-600 text-white w-7 h-7 flex items-center justify-center rounded-full shadow-lg transition-opacity duration-500 opacity-90 z-10 animate-pulse">
                      <span className="text-lg font-bold">←</span>
                    </div>
                  </>
                )}
                <Table<ApplicationDetails>
                  className={{
                    root: 'text-xs',
                    tableHeader: 'text-sm',
                  }}
                  columns={[
                    {
                      label: 'Date',
                      accessor: 'createdAt',
                      sortable: true,
                      transformer: ({ row }) =>
                        format(parseISO(row.createdAt), 'dd.MM.yyyy'),
                    },
                    {
                      label: 'Email',
                      accessor: 'email',
                      sortable: true,
                    },
                    {
                      label: 'Working Period',
                      accessor: 'plannedStartAt',
                      sortable: true,
                      transformer: ({ row }) =>
                        `${format(
                          parseISO(row.plannedStartAt),
                          'd.M.Y'
                        )} - ${format(
                          add(parseISO(row.plannedStartAt), { months: 6 }),
                          'd.M.Y'
                        )}`,
                    },
                    {
                      label: 'Details',
                      accessor: 'details',
                      transformer: ({ row }) => (
                        <ApplicationDetailsModal
                          row={row}
                          isModalOpen={isModalOpen}
                          setIsModalOpen={setIsModalOpen}
                        />
                      ),
                    },
                    {
                      label: 'Action',
                      accessor: 'action',
                      transformer: ({ row }) => (
                        <ConfirmationModal
                          row={row}
                          isConfirmationModalOpen={isConfirmationModalOpen}
                          setIsConfirmationModalOpen={setIsConfirmationModalOpen}
                          acceptApplication={acceptApplication}
                          proposalDetails={proposalDetails}
                          refetch={refetch}
                          setFilters={setFilters}
                        />
                      ),
                    },
                  ]}
                  data={proposalDetails?.applications}
                  defaultSortField="createdAt"
                />
              </div>
            )}
          </div>
        ) : (
          isSupervisor && (
            <div className="bg-yellow-100">
              You are not allowed to see any applications to this proposal.
            </div>
          )
        )}
      </div>
    )
  } else {
    return null
  }
}
