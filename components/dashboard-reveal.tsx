import type { ReactNode } from "react";

/** Staggered section reveal for dashboard homes via CSS delays. */
export function DashboardReveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`min-w-0 ${className}`}>{children}</div>;
}

export function DashboardRevealItem({
  children,
  className = "",
  index = 0,
}: {
  children: ReactNode;
  className?: string;
  /** 0-based stagger index; each step adds 80ms. */
  index?: number;
}) {
  return (
    <div
      className={`min-w-0 animate-crease-rise ${className}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {children}
    </div>
  );
}
