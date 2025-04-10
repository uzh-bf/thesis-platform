import { twMerge } from 'tailwind-merge'

function Footer() {  
  return (
    <footer className={twMerge('hidden md:block print:hidden flex-none')}>
      <hr className="h-[1px] border-0 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

      <div className="py-4 m-0 text-xs leading-5 text-center text-gray-400">
        <p>
          &copy;
          {new Date().getFullYear()} {process.env.NEXT_PUBLIC_FOOTER_COPYRIGHT}
        </p>
        <p className="mt-1">
          Version: {process.env.NEXT_PUBLIC_APP_VERSION}
        </p>
      </div>
    </footer>
  )
}

export default Footer
