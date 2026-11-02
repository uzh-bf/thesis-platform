export type SupervisorSettingsDraft = {
  topicAreaSlugs: string[]
  submissionNotifications: boolean
}

type Props = {
  idPrefix: string
  topicAreas: { slug: string; name: string }[]
  value: SupervisorSettingsDraft
  onChange: (value: SupervisorSettingsDraft) => void
  disabled?: boolean
}

// Topic areas and the notification opt-in of a supervisor, used by admins in
// the Supervisors tab and by supervisors for their own settings.
export default function SupervisorSettingsFields({
  idPrefix,
  topicAreas,
  value,
  onChange,
  disabled,
}: Readonly<Props>) {
  const toggleArea = (slug: string, checked: boolean) =>
    onChange({
      ...value,
      topicAreaSlugs: checked
        ? [...value.topicAreaSlugs, slug]
        : value.topicAreaSlugs.filter((s) => s !== slug),
    })

  return (
    <div className="flex flex-col gap-2">
      <fieldset>
        <legend className="text-xs font-medium text-gray-700 mb-1">
          Topic areas
        </legend>
        <div className="flex flex-col gap-1">
          {topicAreas.map((area) => {
            const id = `${idPrefix}-area-${area.slug}`
            return (
              <label
                key={area.slug}
                htmlFor={id}
                className="flex items-center gap-2 text-sm text-gray-800"
              >
                <input
                  id={id}
                  type="checkbox"
                  checked={value.topicAreaSlugs.includes(area.slug)}
                  onChange={(e) => toggleArea(area.slug, e.target.checked)}
                  disabled={disabled}
                />
                {area.name}
              </label>
            )
          })}
        </div>
      </fieldset>
      <label
        htmlFor={`${idPrefix}-notifications`}
        className="flex items-center gap-2 text-sm text-gray-800"
      >
        <input
          id={`${idPrefix}-notifications`}
          type="checkbox"
          aria-label="Email about new student proposals in these topic areas"
          checked={value.submissionNotifications}
          onChange={(e) =>
            onChange({ ...value, submissionNotifications: e.target.checked })
          }
          disabled={disabled}
        />
        <span>Email about new student proposals in these topic areas</span>
      </label>
    </div>
  )
}
