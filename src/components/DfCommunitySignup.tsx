import type { FormEvent } from 'react'
import { useRef, useState } from 'react'
import {
  DF_COMMUNITY_CAREERS_URL,
  DF_COMMUNITY_PRIVACY_URL,
  DF_COMMUNITY_SIGNUP_ANCHOR,
  DF_COMMUNITY_SIGNUP_FORM_ACTION,
  DF_COMMUNITY_TOPICS,
} from 'src/lib/dfCommunity'

export default function DfCommunitySignup() {
  const firstTopicRef = useRef<HTMLInputElement>(null)
  const [topicError, setTopicError] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const hasTopic = Boolean(
      event.currentTarget.querySelector<HTMLInputElement>(
        'input[name="tags[]"]:checked'
      )
    )

    if (!hasTopic) {
      event.preventDefault()
      setTopicError(true)
      firstTopicRef.current?.focus()
    }
  }

  return (
    <section
      id={DF_COMMUNITY_SIGNUP_ANCHOR}
      aria-labelledby="df-community-signup-heading"
      tabIndex={-1}
      className="mx-auto w-full max-w-[1440px] scroll-mt-6 px-4 pb-12 pt-2 md:px-10 xl:px-10"
    >
      <div className="rounded-lg border border-[#E9E9E9] bg-white p-6 shadow-sm md:p-8 lg:p-10">
        <div className="max-w-3xl">
          <h2
            id="df-community-signup-heading"
            className="text-2xl font-semibold leading-tight text-[#121212] md:text-[26px]"
          >
            Join the DF Community
          </h2>
          <p className="mt-2 text-pretty text-base leading-7 text-[#4C4C4C]">
            Welcome to the DF Community — your source for important information
            from the Department of Finance. Subscribe for updates about your
            studies, jobs and events, thesis topics, and opportunities to
            participate in teaching projects.
          </p>
          <a
            href={DF_COMMUNITY_CAREERS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center text-sm font-semibold text-[#365DD5] underline underline-offset-2 hover:text-[#0028A5] focus:outline-none focus:ring-2 focus:ring-[#0028A5] focus:ring-offset-2"
          >
            Explore current jobs and events on DF Careers
            <span aria-hidden="true" className="ml-1">
              ↗
            </span>
          </a>
        </div>

        <form
          action={DF_COMMUNITY_SIGNUP_FORM_ACTION}
          method="post"
          target="_blank"
          rel="noopener noreferrer"
          onSubmit={handleSubmit}
          className="mt-8 space-y-6"
        >
          <div
            aria-hidden="true"
            className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden"
          >
            <label htmlFor="df-community-email-confirm">
              Leave this field empty
            </label>
            <input
              id="df-community-email-confirm"
              name="email_confirm"
              type="text"
              autoComplete="off"
              tabIndex={-1}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="space-y-2">
              <label
                htmlFor="df-community-email"
                className="block text-sm font-semibold text-[#121212]"
              >
                Email address <span className="text-[#B50000]">*</span>
              </label>
              <input
                id="df-community-email"
                name="email"
                type="email"
                required
                className="w-full rounded-[4px] border border-[#6B7280] px-3 py-2.5 text-sm text-[#121212] transition-colors focus:border-[#0028A5] focus:outline-none focus:ring-2 focus:ring-[#0028A5]/20"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="df-community-study-start"
                className="block text-sm font-semibold text-[#121212]"
              >
                Start of studies (optional)
              </label>
              <input
                id="df-community-study-start"
                name="global.studienstart"
                type="number"
                inputMode="numeric"
                placeholder="2025"
                className="w-full rounded-[4px] border border-[#6B7280] px-3 py-2.5 text-sm text-[#121212] transition-colors focus:border-[#0028A5] focus:outline-none focus:ring-2 focus:ring-[#0028A5]/20"
              />
            </div>
          </div>

          <fieldset
            aria-describedby={`df-community-topics-hint${topicError ? ' df-community-topics-error' : ''}`}
            aria-invalid={topicError ? 'true' : undefined}
            className="space-y-3"
          >
            <legend className="text-sm font-semibold text-[#121212]">
              What would you like to hear about?{' '}
              <span className="text-[#B50000]">*</span>
            </legend>
            <p id="df-community-topics-hint" className="text-sm text-[#4C4C4C]">
              Select one or more topics.
            </p>
            {topicError && (
              <p
                id="df-community-topics-error"
                className="text-sm font-semibold text-[#B50000]"
                role="alert"
              >
                Please choose at least one topic.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {DF_COMMUNITY_TOPICS.map((topic, index) => (
                <label
                  key={topic.value}
                  className="flex min-h-12 items-start gap-3 rounded-lg border border-[#E9E9E9] px-4 py-3 text-sm leading-5 text-[#4C4C4C] transition-colors hover:border-[#0028A5]/40 hover:bg-[#F5F5FB] focus-within:border-[#0028A5] focus-within:ring-2 focus-within:ring-[#0028A5]/20"
                >
                  <input
                    ref={index === 0 ? firstTopicRef : undefined}
                    name="tags[]"
                    type="checkbox"
                    value={topic.value}
                    onChange={(event) => {
                      if (event.currentTarget.checked) {
                        setTopicError(false)
                      }
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#6B7280] text-[#0028A5] focus:ring-2 focus:ring-[#0028A5]/30"
                  />
                  <span>{topic.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-3 border-t border-[#E9E9E9] pt-5">
            <p className="max-w-4xl text-sm leading-6 text-[#4C4C4C]">
              By subscribing, you agree that we may process your data for
              newsletter delivery. Details can be found in our{' '}
              <a
                href={DF_COMMUNITY_PRIVACY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#365DD5] underline underline-offset-2 hover:text-[#0028A5] focus:outline-none focus:ring-2 focus:ring-[#0028A5] focus:ring-offset-2"
              >
                privacy policy
              </a>
              .
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 text-xs leading-5 text-[#4C4C4C]">
                <p>Fields marked with * are required.</p>
                <p>The confirmation step opens in a new tab.</p>
              </div>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-[4px] bg-[#0028A5] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#001E7C] focus:outline-none focus:ring-2 focus:ring-[#0028A5] focus:ring-offset-2"
              >
                Subscribe
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  )
}
