import { twMerge } from 'tailwind-merge'

function Footer() {
  return (
    <footer className={twMerge('hidden md:block print:hidden flex-none')}>
      <hr className="h-[1px] border-0 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

      <p className="py-4 m-0 text-xs leading-5 text-center text-gray-400">
        &copy;
        {new Date().getFullYear()} Department of Banking and Finance, University
        of Zurich. All rights reserved.
      </p>
    </footer>
  )
}

export default Footer
