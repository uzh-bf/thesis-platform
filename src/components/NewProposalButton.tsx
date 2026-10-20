import { faAdd } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, Modal } from '@uzh-bf/design-system'
import Link from 'next/link'
import { useState, useSyncExternalStore } from 'react'
import { isSafariUserAgent } from 'src/lib/browser'
import ProposalPublishForm from './ProposalPublishForm'

// The user agent never changes during a page visit
const subscribeToUserAgent = () => () => {}

interface NewProposalButtonProps {
  isSupervisor: boolean
}

export default function NewProposalButton({
  isSupervisor,
}: NewProposalButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const buttonClass =
    'flex items-center rounded-[4px] border-[#0028A5] bg-[#0028A5] px-3 py-1.5 text-sm font-semibold text-white shadow-none hover:bg-[#001E7C] hover:text-white'
  const submitFormUrl = process.env.NEXT_PUBLIC_FORMS_URL_SUBMIT as string

  // The server snapshot is false so server-side rendering and hydration agree
  const isSafari = useSyncExternalStore(
    subscribeToUserAgent,
    () => isSafariUserAgent(navigator.userAgent),
    () => false
  )

  // Rendered outside the Modal because its trigger slot drops the button's
  // own classes, which made the button fall back to the default styling
  const openModalButton = (
    <Button
      onClick={() => setIsModalOpen(true)}
      className={{ root: buttonClass }}
    >
      <FontAwesomeIcon icon={faAdd} className="mr-2" />
      New Proposal
    </Button>
  )

  if (isSupervisor) {
    return (
      <>
        {openModalButton}
        <Modal
          title="Publish New Supervisor Proposal"
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        >
          <ProposalPublishForm onSuccess={() => setIsModalOpen(false)} />
        </Modal>
      </>
    )
  }

  // The student submission form is a Microsoft Form, which can hang on
  // "Loading" in Safari depending on its privacy settings, so Safari users
  // get a hint to switch browsers before leaving the platform
  if (isSafari) {
    return (
      <>
        {openModalButton}
        <Modal
          title="Submit a Thesis Proposal"
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        >
          <div className="flex flex-col gap-4 text-sm">
            <p>
              Proposals are submitted through a Microsoft Form that requires
              your UZH account (@uzh.ch).
            </p>
            <p>
              It looks like you are using Safari. In some Safari setups the form
              stays on &quot;Loading&quot; and no sign-in appears. If that
              happens, please open the form in Chrome, Edge or Firefox instead.
            </p>
            <div className="flex justify-end">
              <Link
                target="_blank"
                href={submitFormUrl}
                onClick={() => setIsModalOpen(false)}
              >
                <Button className={{ root: buttonClass }}>Open form</Button>
              </Link>
            </div>
          </div>
        </Modal>
      </>
    )
  }

  return (
    <div>
      <Link target="_blank" href={submitFormUrl}>
        <Button className={{ root: buttonClass }}>
          <FontAwesomeIcon icon={faAdd} className="mr-2" />
          New Proposal
        </Button>
      </Link>
    </div>
  )
}
