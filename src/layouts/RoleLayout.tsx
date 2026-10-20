import type { ReactNode } from "react";
import type { Role, Theme } from "../types";

export default function RoleLayout({
  role,
  theme,
  children,
}: {
  role: Role;
  theme: Theme;
  children: ReactNode;
}) {
  return (
    <div
      data-role={role}
      data-theme={theme}
      className="min-h-screen bg-[var(--bg)] text-[var(--text)]"
    >
      {children}
    </div>
  );
}
