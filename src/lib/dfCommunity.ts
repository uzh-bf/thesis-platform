export const DF_COMMUNITY_SIGNUP_ANCHOR = 'df-community-signup'

export const DF_COMMUNITY_SIGNUP_FORM_ACTION =
  'https://flow.cleverreach.com/fl/23d61875-1675-49c3-98bd-45d17dea2a10/confirm'

export const DF_COMMUNITY_PRIVACY_URL =
  'https://careers.df.uzh.ch/en/data-protection'

export const DF_COMMUNITY_CAREERS_URL = 'https://careers.df.uzh.ch/en'

export const DF_COMMUNITY_TOPICS = [
  {
    value: 'info',
    label: 'Current information about studies (e.g. seminars, tutorials)',
  },
  {
    value: 'df_jobs_events',
    label: 'Events and jobs from the Department of Finance and WWF',
  },
  {
    value: 'ext_jobs_events',
    label: 'Events and jobs from industry',
  },
  {
    value: 'thesen',
    label: 'Updates on thesis topics',
  },
  {
    value: 'lehrprojekte',
    label: 'Participate in teaching projects (e.g. surveys, testing)',
  },
] as const

export function isDfCommunitySignupEnabled() {
  return (
    process.env.NEXT_PUBLIC_ENABLE_DF_COMMUNITY_SIGNUP === 'true' &&
    process.env.NEXT_PUBLIC_DEPARTMENT_NAME === 'DF'
  )
}
