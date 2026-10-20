import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import type { Role } from "../types"

type AuthContextValue = { role: Role; isAdmin: boolean; switchRole: () => void }
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("Admin")
  const value = useMemo(() => ({ role, isAdmin: role === "Admin", switchRole: () => setRole(current => current === "Admin" ? "Front Desk" : "Admin") }), [role])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error("useAuth must be used inside AuthProvider"); return context }
