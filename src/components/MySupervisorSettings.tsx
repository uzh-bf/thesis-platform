import { faSliders } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, Modal } from '@uzh-bf/design-system'
import { useState } from 'react'
import SupervisorSettingsFields, {
  type SupervisorSettingsDraft,
} from 'src/components/SupervisorSettingsFields'
import { trpc } from 'src/lib/trpc'

// Lets supervisors choose their topic areas and whether they are emailed
// about new student proposals in them.
export default function MySupervisorSettings({
  buttonClassName,
}: Readonly<{
  buttonClassName: string
}>) {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState<SupervisorSettingsDraft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const { data, refetch } = trpc.getMySupervisorSettings.useQuery()
  const update = trpc.updateMySupervisorSettings.useMutation({
    onSuccess: async () => {
      setError(null)
      setSaved(true)
      await refetch()
      setDraft(null)
    },
    onError: (mutationError) => setError(mutationError.message),
  })

  if (!data) return null

  const value = draft ?? {
    topicAreaSlugs: data.topicAreaSlugs,
    submissionNotifications: data.submissionNotifications,
  }

  return (
    <Modal
      title="My topic areas"
      open={isOpen}
      trigger={
        <Button
          onClick={() => {
            setDraft(null)
            setError(null)
            setSaved(false)
            setIsOpen(true)
          }}
          className={{ root: `flex items-center gap-2 ${buttonClassName}` }}
        >
          <FontAwesomeIcon icon={faSliders} />
          My topic areas
        </Button>
      }
      onClose={() => setIsOpen(false)}
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-gray-600">
          Choose the topic areas you supervise. With notifications on, you
          receive an email when a student submits a proposal in one of them.
        </p>
        <SupervisorSettingsFields
          idPrefix="my-supervisor-settings"
          topicAreas={data.topicAreas}
          value={value}
          onChange={(next) => {
            setDraft(next)
            setSaved(false)
          }}
          disabled={update.isPending}
        />
        <div className="flex items-center gap-3">
          <Button
            onClick={() => update.mutate(value)}
            disabled={update.isPending || draft === null}
          >
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
          {saved && <span className="text-sm text-green-700">Saved</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>
    </Modal>
  )
}
