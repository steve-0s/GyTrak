import type { ReactNode } from "react"
import { AuthProvider } from "../contexts/AuthContext"
import { ThemeProvider } from "../contexts/ThemeContext"
import { GymDataProvider } from "../contexts/GymDataContext"
import ToastProvider from "../components/shared/ToastProvider"

export function AppProviders({ children }: { children: ReactNode }) { return <AuthProvider><ThemeProvider><GymDataProvider>{children}<ToastProvider /></GymDataProvider></ThemeProvider></AuthProvider> }
