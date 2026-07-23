import Image from 'next/image'
import useIsEmbedded from 'src/lib/hooks/useIsEmbedded'

function Footer() {
  const isEmbedded = useIsEmbedded()
  const departmentName =
    process.env.NEXT_PUBLIC_DEPARTMENT_LONG_NAME?.trim() ?? ''
  const departmentShortName = process.env.NEXT_PUBLIC_DEPARTMENT_NAME?.trim()
  const footerDescription =
    process.env.NEXT_PUBLIC_FOOTER_DESCRIPTION?.trim() ||
    (departmentName
      ? `Thesis proposals and applications for the ${departmentName}.`
      : 'Thesis proposals and applications.')
  const copyright =
    process.env.NEXT_PUBLIC_FOOTER_COPYRIGHT ?? 'Universität Zürich'
  const contactEmail =
    process.env.NEXT_PUBLIC_CONTACT_EMAIL ??
    (departmentShortName === 'IBW'
      ? 'theses@business.uzh.ch'
      : 'theses@df.uzh.ch')
  const faqUrl =
    process.env.NEXT_PUBLIC_FAQ_URL_STUDENT ??
    process.env.NEXT_PUBLIC_FAQ_URL_SUPERVISOR

  // Embedded pages live inside a host page with its own footer, so only a
  // slim bar with the essential links is shown
  if (isEmbedded) {
    return (
      <footer className="flex-none border-t border-[#E9E9E9] bg-white print:hidden">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-2 px-4 py-4 text-sm text-[#4C4C4C] md:flex-row md:items-center md:justify-between md:px-10 xl:px-10">
          <p className="m-0">
            &copy; {new Date().getFullYear()} {copyright}
          </p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <a
              href={`mailto:${contactEmail}`}
              className="font-semibold text-[#365DD5] hover:text-[#0028A5]"
            >
              {contactEmail}
            </a>
            {faqUrl && (
              <a
                href={faqUrl}
                className="hover:text-[#0028A5]"
                target="_blank"
                rel="noreferrer"
              >
                FAQ
              </a>
            )}
            <a
              href="https://www.df.uzh.ch/de/impressum.html"
              target="_blank"
              rel="noreferrer"
            >
              Impressum
            </a>
          </nav>
        </div>
      </footer>
    )
  }

  return (
    <footer className="flex-none border-t border-[#E9E9E9] bg-white print:hidden">
      <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-4 py-12 md:grid-cols-[1.5fr_1fr_1fr] md:px-10 xl:px-10">
        <div>
          <Image
            src="/uzh-logo.svg"
            alt="Universität Zürich"
            width={143}
            height={49}
            className="h-12 w-auto"
          />
          <p className="mt-6 max-w-sm text-base leading-7 text-[#4C4C4C]">
            {footerDescription}
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.04em] text-[#121212]">
            Kontakt
          </h2>
          <address className="mt-5 space-y-2 text-base not-italic leading-7 text-[#4C4C4C]">
            <div>Universität Zürich</div>
            {departmentName && <div>{departmentName}</div>}
            <div>Plattenstrasse 14</div>
            <div>8032 Zürich</div>
            <div>Schweiz</div>
            <a
              href={`mailto:${contactEmail}`}
              className="block pt-2 font-semibold text-[#365DD5] hover:text-[#0028A5]"
            >
              {contactEmail}
            </a>
          </address>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.04em] text-[#121212]">
            Links
          </h2>
          <nav className="mt-5 flex flex-col gap-2 text-base text-[#4C4C4C]">
            <a
              href="https://www.uzh.ch"
              className="hover:text-[#0028A5]"
              target="_blank"
            >
              Universität Zürich
            </a>
            {faqUrl && (
              <a href={faqUrl} className="hover:text-[#0028A5]" target="_blank">
                FAQ / Documentation
              </a>
            )}
            {process.env.NEXT_PUBLIC_APP_VERSION && (
              <span className="pt-2 text-sm text-[#666666]">
                Version {process.env.NEXT_PUBLIC_APP_VERSION}
              </span>
            )}
          </nav>
        </div>
      </div>

      <div className="border-t border-[#E9E9E9]">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-5 text-sm text-[#4C4C4C] md:flex-row md:items-center md:justify-between md:px-10 xl:px-10">
          <p className="m-0">
            &copy; {new Date().getFullYear()} {copyright}
          </p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <a href="https://www.df.uzh.ch/de/impressum.html" target="_blank">
              Impressum
            </a>
          </nav>
        </div>
      </div>
    </footer>
  )
}

export default Footer
