import { expect, test } from '@playwright/test'

const communitySignupEnabled = process.env.E2E_DF_COMMUNITY_SIGNUP === 'true'

const formAction =
  'https://flow.cleverreach.com/fl/23d61875-1675-49c3-98bd-45d17dea2a10/confirm'

test.describe('DF Community signup', () => {
  test('renders the complete community subscription contract safely', async ({
    page,
  }) => {
    test.skip(!communitySignupEnabled, 'Requires the enabled DF E2E server.')

    let providerRequestCount = 0
    await page.route('https://flow.cleverreach.com/**', async (route) => {
      providerRequestCount += 1
      await route.abort('blockedbyclient')
    })

    await page.goto('/')

    await expect(
      page.getByRole('heading', {
        name: 'From your thesis to your next opportunity',
      })
    ).toBeVisible()

    const bannerCta = page.getByRole('link', {
      name: 'Join the DF Community',
    })
    await expect(bannerCta).toHaveAttribute('href', '#df-community-signup')
    await bannerCta.click()
    await expect(page).toHaveURL(/#df-community-signup$/)
    await expect(
      page.getByRole('heading', { name: 'Join the DF Community' })
    ).toBeVisible()

    const form = page.locator(`form[action="${formAction}"]`)
    await expect(form).toHaveCount(1)
    await expect(form).toHaveAttribute('method', 'post')
    await expect(form).toHaveAttribute('target', '_blank')
    await expect(form).toHaveAttribute('rel', 'noopener noreferrer')

    const email = form.locator('input[name="email"]')
    const studyStart = form.locator('input[name="global.studienstart"]')
    const honeypot = form.locator('input[name="email_confirm"]')
    const topics = form.locator('input[name="tags[]"]')

    await expect(email).toHaveAttribute('type', 'email')
    await expect(email).toHaveAttribute('required', '')
    await expect(studyStart).toHaveAttribute('type', 'number')
    await expect(studyStart).not.toHaveAttribute('required')
    await expect(honeypot).toHaveCount(1)
    await expect(honeypot).toHaveValue('')
    await expect(honeypot).toHaveAttribute('tabindex', '-1')
    await expect(topics).toHaveCount(5)

    expect(
      await topics.evaluateAll((inputs) =>
        inputs.map((input) => (input as HTMLInputElement).value)
      )
    ).toEqual([
      'info',
      'df_jobs_events',
      'ext_jobs_events',
      'thesen',
      'lehrprojekte',
    ])
    expect(
      await topics.evaluateAll((inputs) =>
        inputs.map((input) => (input as HTMLInputElement).checked)
      )
    ).toEqual([false, false, false, false, false])

    await email.fill('student@example.invalid')
    await studyStart.fill('2024')
    const formData = await form.evaluate((formElement) =>
      Array.from(new FormData(formElement as HTMLFormElement).entries()).map(
        ([key, value]) => [key, String(value)]
      )
    )
    expect(formData).toEqual(
      expect.arrayContaining([
        ['email', 'student@example.invalid'],
        ['global.studienstart', '2024'],
      ])
    )
    expect(formData.some(([key]) => key === 'tags[]')).toBe(false)

    await page.getByRole('button', { name: 'Subscribe' }).click()
    await expect(
      page.getByRole('alert', { name: 'Please choose at least one topic.' })
    ).toBeVisible()
    await expect(topics.first()).toBeFocused()
    expect(providerRequestCount).toBe(0)

    await topics.first().check()
    await expect(
      page.getByRole('alert', { name: 'Please choose at least one topic.' })
    ).toBeHidden()

    await email.fill('')
    await page.getByRole('button', { name: 'Subscribe' }).click()
    await expect
      .poll(() =>
        email.evaluate((input: HTMLInputElement) => input.validity.valid)
      )
      .toBe(false)
    expect(providerRequestCount).toBe(0)
  })

  test('does not render outside an enabled DF build', async ({ page }) => {
    test.skip(communitySignupEnabled, 'Requires the disabled/IBW E2E server.')

    await page.goto('/')
    await expect(
      page.getByRole('heading', {
        name: 'From your thesis to your next opportunity',
      })
    ).toHaveCount(0)
    await expect(page.locator('#df-community-signup')).toHaveCount(0)
  })
})
