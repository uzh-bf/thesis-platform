import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Image from 'next/image'
import { DF_COMMUNITY_SIGNUP_ANCHOR } from 'src/lib/dfCommunity'

export default function DfCommunityBanner() {
  return (
    <section
      aria-labelledby="df-community-banner-heading"
      className="mx-auto w-full max-w-[1440px] px-4 pt-0 md:px-10 xl:px-10"
    >
      <div className="relative overflow-hidden bg-[#0028A5] shadow-sm sm:rounded-lg">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden md:block"
          style={{
            background:
              'linear-gradient(90deg, rgba(0,40,165,0.96) 0%, rgba(0,40,165,0.9) 50%, rgba(0,40,165,0.55) 80%, rgba(0,40,165,0.3) 100%)',
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-4 hidden items-center opacity-75 md:right-8 xl:flex"
        >
          <Image
            src="/uzh-main-building.svg"
            alt=""
            width={256}
            height={256}
            priority
            className="h-40 w-40 2xl:h-48 2xl:w-48"
          />
        </div>

        <div className="relative px-4 py-8 sm:px-8 md:px-10 md:py-8">
          <div className="max-w-3xl">
            <h1
              id="df-community-banner-heading"
              className="text-balance text-2xl font-semibold leading-[1.12] tracking-tight text-white md:text-3xl lg:text-4xl"
            >
              From your thesis to your next opportunity
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85 md:text-base">
              Join the DF Community for jobs, events, thesis opportunities,
              teaching projects and academic opportunities from the Department
              of Finance and selected partners.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={`#${DF_COMMUNITY_SIGNUP_ANCHOR}`}
                className="inline-flex items-center gap-2 rounded-[4px] bg-white px-4 py-2 text-sm font-semibold text-[#0028A5] shadow-sm transition-colors hover:bg-[#F5F5FB] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0028A5]"
              >
                Join the DF Community
                <FontAwesomeIcon
                  icon={faArrowRight}
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
