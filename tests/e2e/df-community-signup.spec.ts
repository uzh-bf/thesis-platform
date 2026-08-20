import { expect, test, type Page } from '@playwright/test'

const communitySignupEnabled = process.env.E2E_DF_COMMUNITY_SIGNUP === 'true'

const formAction =
  'https://flow.cleverreach.com/fl/23d61875-1675-49c3-98bd-45d17dea2a10/confirm'

const assertNoHorizontalOverflow = async (page: Page) => {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth
    )
  ).toBe(true)
}

test.describe('DF Community signup', () => {
  test.beforeEach(async ({ context }) => {
    await context.route('https://flow.cleverreach.com/**', async (route) => {
      await route.abort('blockedbyclient')
    })
  })

  test('renders the complete community subscription contract safely', async ({
    context,
    page,
  }) => {
    test.skip(!communitySignupEnabled, 'Requires the enabled DF E2E server.')

    let providerRequestCount = 0
    await context.route('https://flow.cleverreach.com/**', async (route) => {
      providerRequestCount += 1
      await route.abort('blockedbyclient')
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

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
    await expect(page.locator('#df-community-signup')).toBeFocused()
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
    const topicError = form.locator('[role="alert"]')
    await expect(topicError).toHaveText('Please choose at least one topic.')
    await expect(topicError).toBeVisible()
    await expect(topics.first()).toBeFocused()
    expect(providerRequestCount).toBe(0)

    await topics.first().check()
    await expect(topicError).toBeHidden()

    await email.fill('')
    await page.getByRole('button', { name: 'Subscribe' }).click()
    await expect
      .poll(() =>
        email.evaluate((input: HTMLInputElement) => input.validity.valid)
      )
      .toBe(false)
    expect(providerRequestCount).toBe(0)
  })

  test('stays usable on narrow mobile layouts and hides behind proposal details', async ({
    browser,
  }) => {
    test.skip(!communitySignupEnabled, 'Requires the enabled DF E2E server.')

    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    })

    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 })
      await page.goto('/')
      await expect(
        page.getByRole('heading', {
          name: 'From your thesis to your next opportunity',
        })
      ).toBeVisible()
      await assertNoHorizontalOverflow(page)
    }

    await page.setViewportSize({ width: 390, height: 844 })
    const proposalCard = page
      .locator('main button')
      .filter({ hasText: 'Supervisor' })
      .first()
    await expect(proposalCard).toBeVisible()
    await proposalCard.click()
    await expect(
      page.getByRole('button', { name: 'Back to proposals' })
    ).toBeVisible()
    await expect(page.locator('#df-community-signup')).toHaveCount(0)
    await expect(
      page.getByRole('heading', {
        name: 'From your thesis to your next opportunity',
      })
    ).toHaveCount(0)

    await page.getByRole('button', { name: 'Back to proposals' }).click()
    await expect(
      page.getByRole('heading', {
        name: 'From your thesis to your next opportunity',
      })
    ).toBeVisible()
    await assertNoHorizontalOverflow(page)
    await page.close()
  })

  test('reports embedded validation growth without nested overflow', async ({
    page,
  }) => {
    test.skip(!communitySignupEnabled, 'Requires the enabled DF E2E server.')

    await page.goto('/api/health')
    await page.evaluate(() => {
      document.body.dataset.dfResizeMessages = '0'
      window.addEventListener('message', (event) => {
        if (
          event.data?.source !== 'thesis-platform' ||
          event.data?.type !== 'resize'
        ) {
          return
        }

        const count = Number(document.body.dataset.dfResizeMessages ?? '0')
        document.body.dataset.dfResizeMessages = String(count + 1)
      })
    })
    await page.evaluate(() => {
      const iframe = document.createElement('iframe')
      iframe.title = 'Thesis Market embed'
      iframe.src = '/'
      document.body.replaceChildren(iframe)
    })

    const frame = page.frameLocator('iframe[title="Thesis Market embed"]')
    await expect(
      frame.getByRole('heading', { name: 'Join the DF Community' })
    ).toBeVisible()
    await expect(frame.getByText('Thesis Market')).toBeVisible()
    expect(
      await frame
        .locator('html')
        .evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth
        )
    ).toBe(true)

    const form = frame.locator(`form[action="${formAction}"]`)
    await form.locator('input[name="email"]').fill('student@example.invalid')
    const initialMessageCount = await page.evaluate(() =>
      Number(document.body.dataset.dfResizeMessages ?? '0')
    )
    await frame.getByRole('button', { name: 'Subscribe' }).click()
    const topicError = form.locator('[role="alert"]')
    await expect(topicError).toHaveText('Please choose at least one topic.')
    await expect(topicError).toBeVisible()
    await expect
      .poll(() =>
        page.evaluate(() =>
          Number(document.body.dataset.dfResizeMessages ?? '0')
        )
      )
      .toBeGreaterThan(initialMessageCount)
    expect(
      await frame
        .locator('html')
        .evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth
        )
    ).toBe(true)
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
