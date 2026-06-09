import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useState } from 'react'

const MAINTENANCE_END_AT = new Date('2026-06-17T11:00:00+02:00').getTime()

function isMaintenanceNoticeVisible() {
  return Date.now() < MAINTENANCE_END_AT
}

export default function ScheduledMaintenanceBanner() {
  const [isVisible, setIsVisible] = useState(isMaintenanceNoticeVisible)

  useEffect(() => {
    const updateVisibility = () => {
      setIsVisible(isMaintenanceNoticeVisible())
    }

    updateVisibility()

    const intervalId = window.setInterval(updateVisibility, 60_000)

    return () => window.clearInterval(intervalId)
  }, [])

  if (!isVisible) {
    return null
  }

  return (
    <aside
      aria-label="Planned maintenance"
      aria-live="polite"
      className="border-b border-[#E9E9E9] bg-[#F5F5FB] print:hidden"
      role="status"
    >
      <div className="mx-auto flex w-full max-w-[1440px] gap-3 px-4 py-3 text-[#121212] md:px-10">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] bg-[#0028A5] text-white">
          <FontAwesomeIcon
            aria-hidden="true"
            className="h-4 w-4"
            icon={faTriangleExclamation}
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm leading-5 font-semibold text-[#0028A5]">
            Planned maintenance
          </p>
          <p className="text-sm leading-5 text-[#121212] md:text-base md:leading-6">
            Thesis Market will be unavailable on{' '}
            <strong className="font-semibold">
              Wednesday, 17 June 2026, 09:00-11:00 (Zurich time)
            </strong>{' '}
            while we migrate the database from MySQL to PostgreSQL. Please save
            any work before 09:00.
          </p>
        </div>
      </div>
    </aside>
  )
}
