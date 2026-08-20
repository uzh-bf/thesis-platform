export const DF_COMMUNITY_SIGNUP_ANCHOR = 'df-community-signup'

export const DF_COMMUNITY_SIGNUP_FORM_ACTION =
  'https://flow.cleverreach.com/fl/23d61875-1675-49c3-98bd-45d17dea2a10/confirm'

export const DF_COMMUNITY_PRIVACY_URL =
  'https://careers.df.uzh.ch/en/data-protection'

export const DF_COMMUNITY_CAREERS_URL = 'https://careers.df.uzh.ch/en'

export const DF_COMMUNITY_TOPICS = [
  {
    value: 'info',
    label: 'General information from DF Community - Careers',
  },
  {
    value: 'df_jobs_events',
    label: 'Jobs and events from the Department of Finance and WWF',
  },
  {
    value: 'ext_jobs_events',
    label: 'Jobs and events from external partners',
  },
  {
    value: 'thesen',
    label: "Bachelor's and master's thesis opportunities",
  },
  {
    value: 'lehrprojekte',
    label: 'Teaching projects and academic opportunities',
  },
] as const

export function isDfCommunitySignupEnabled() {
  return (
    process.env.NEXT_PUBLIC_ENABLE_DF_COMMUNITY_SIGNUP === 'true' &&
    process.env.NEXT_PUBLIC_DEPARTMENT_NAME === 'DF'
  )
}
