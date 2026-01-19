import { twMerge } from 'tailwind-merge'

function Footer() {
  return (
    <footer className={twMerge('hidden md:block print:hidden flex-none')}>
      <hr className="h-px border-0 bg-linear-to-r from-transparent via-gray-300 to-transparent" />

      <div className="py-4 px-4 text-xs leading-5 text-gray-400 flex justify-between items-center">
        <p className="m-0 flex-1 text-center">
          &copy;
          {new Date().getFullYear()} {process.env.NEXT_PUBLIC_FOOTER_COPYRIGHT}
        </p>
        {process.env.NEXT_PUBLIC_APP_VERSION && (
          <span className="text-gray-300">
            {process.env.NEXT_PUBLIC_APP_VERSION}
          </span>
        )}
      </div>
    </footer>
  )
}

export default Footer
