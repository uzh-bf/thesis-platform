import { PropsWithChildren } from 'react'

function ThesesLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex flex-row h-full">
      <div className="flex-none w-20 h-full border-r">
        <ul>
          <li>thesis 1</li>
        </ul>
      </div>
      <div>{children}</div>
    </div>
  )
}

export default ThesesLayout
