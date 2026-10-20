import type { ReactNode } from "react"
import { AuthProvider } from "../contexts/AuthContext"
import { ThemeProvider } from "../contexts/ThemeContext"

export function AppProviders({ children }: { children: ReactNode }) { return <AuthProvider><ThemeProvider>{children}</ThemeProvider></AuthProvider> }
