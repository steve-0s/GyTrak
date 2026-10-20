import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Role } from "../types";

export type AuthAccount = {
  id: string;
  name: string;
  email: string;
  role: Role;
  branch: string;
  status: "Active" | "Inactive";
  emailVerified: boolean;
  passwordHash: string;
};

type AuthContextValue = {
  account: AuthAccount | null;
  role: Role;
  isAdmin: boolean;
  isAuthenticated: boolean;
  hasInitialAdmin: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  setupAdmin: (name: string, email: string, password: string) => Promise<string | null>;
  signOut: () => void;
  switchRole: () => void;
  changeEmail: (newEmail: string, confirmation: string, currentPassword: string) => Promise<string | null>;
  changePassword: (currentPassword: string, newPassword: string, confirmation: string) => Promise<string | null>;
  requestPasswordReset: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const accountsKey = "gytrak-mock-accounts";
const sessionKey = "gytrak-mock-session";

function readAccounts(): AuthAccount[] {
  try {
    return JSON.parse(localStorage.getItem(accountsKey) ?? "[]") as AuthAccount[];
  } catch {
    return [];
  }
}

async function hashPassword(password: string) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function saveAccounts(accounts: AuthAccount[]) {
  localStorage.setItem(accountsKey, JSON.stringify(accounts));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<AuthAccount[]>(readAccounts);
  const [accountId, setAccountId] = useState<string | null>(() => localStorage.getItem(sessionKey));
  const [developmentRole, setDevelopmentRole] = useState<Role | null>(null);
  const account = accounts.find((item) => item.id === accountId) ?? null;

  const login = async (email: string, password: string) => {
    const match = accounts.find((item) => item.email.toLowerCase() === email.trim().toLowerCase());
    const passwordHash = await hashPassword(password);
    if (!match || match.passwordHash !== passwordHash) return "The email or password is incorrect.";
    if (match.status !== "Active") return "This account is disabled. Contact your gym administrator.";
    localStorage.setItem(sessionKey, match.id);
    setAccountId(match.id);
    setDevelopmentRole(null);
    return null;
  };

  const setupAdmin = async (name: string, email: string, password: string) => {
    if (accounts.some((item) => item.role === "Admin")) return "Initial Admin setup has already been completed.";
    if (!name.trim() || !email.trim()) return "Name and email are required.";
    if (!/^\S+@\S+\.\S+$/.test(email)) return "Enter a valid email address.";
    if (password.length < 8) return "Use at least 8 characters for the password.";
    if (accounts.some((item) => item.email.toLowerCase() === email.toLowerCase())) return "That email is already in use.";
    const next: AuthAccount = {
      id: "ACC-ADMIN-001",
      name: name.trim(),
      email: email.trim(),
      role: "Admin",
      branch: "All branches",
      status: "Active",
      emailVerified: false,
      passwordHash: await hashPassword(password),
    };
    const nextAccounts = [...accounts, next];
    saveAccounts(nextAccounts);
    setAccounts(nextAccounts);
    localStorage.setItem(sessionKey, next.id);
    setAccountId(next.id);
    return null;
  };

  const signOut = () => {
    localStorage.removeItem(sessionKey);
    setAccountId(null);
    setDevelopmentRole(null);
  };

  const switchRole = () => {
    if (!account) return;
    setDevelopmentRole((current) => current === "Admin" ? "Front Desk" : "Admin");
  };

  const changeEmail = async (newEmail: string, confirmation: string, currentPassword: string) => {
    if (!account) return "You must be signed in.";
    if (newEmail.trim().toLowerCase() !== confirmation.trim().toLowerCase()) return "Email addresses do not match.";
    if (!/^\S+@\S+\.\S+$/.test(newEmail)) return "Enter a valid email address.";
    if (accounts.some((item) => item.id !== account.id && item.email.toLowerCase() === newEmail.toLowerCase())) return "That email is already in use.";
    if (await hashPassword(currentPassword) !== account.passwordHash) return "The current password is incorrect.";
    const next = accounts.map((item) => item.id === account.id ? { ...item, email: newEmail.trim(), emailVerified: false } : item);
    saveAccounts(next);
    setAccounts(next);
    return null;
  };

  const changePassword = async (currentPassword: string, newPassword: string, confirmation: string) => {
    if (!account) return "You must be signed in.";
    if (await hashPassword(currentPassword) !== account.passwordHash) return "The current password is incorrect.";
    if (newPassword.length < 8) return "Use at least 8 characters for the new password.";
    if (newPassword !== confirmation) return "New passwords do not match.";
    const newPasswordHash = await hashPassword(newPassword);
    const next = accounts.map((item) => item.id === account.id ? { ...item, passwordHash: newPasswordHash } : item);
    saveAccounts(next);
    setAccounts(next);
    return null;
  };

  const requestPasswordReset = async (email: string) => {
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    // Mock-only behavior: intentionally does not reveal whether the email exists.
    void email;
  };

  const activeRole = developmentRole ?? account?.role ?? "Admin";
  const value = useMemo(() => ({
    account,
    role: activeRole,
    isAdmin: activeRole === "Admin",
    isAuthenticated: Boolean(account),
    hasInitialAdmin: accounts.some((item) => item.role === "Admin"),
    login,
    setupAdmin,
    signOut,
    switchRole,
    changeEmail,
    changePassword,
    requestPasswordReset,
  }), [account, activeRole, accounts]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
