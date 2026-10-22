import type { ReactNode } from "react"
import { AuthProvider } from "../contexts/AuthContext"
import { ThemeProvider } from "../contexts/ThemeContext"
import { GymDataProvider } from "../contexts/GymDataContext"

export function AppProviders({ children }: { children: ReactNode }) { return <AuthProvider><ThemeProvider><GymDataProvider>{children}</GymDataProvider></ThemeProvider></AuthProvider> }
