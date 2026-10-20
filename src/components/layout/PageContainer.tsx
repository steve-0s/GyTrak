import type { ReactNode } from "react"

export default function PageContainer({ children }: { children: ReactNode }) { return <div className="mx-auto max-w-[1440px] p-5 sm:p-8">{children}</div> }
