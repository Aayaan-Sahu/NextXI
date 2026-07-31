import type { ReactNode } from "react";

/**
 * Restrained mount reveal for auth brand copy and the form column.
 * CSS-driven (`forwards`, not `both`) so delayed/SSR paint stays visible;
 * reduced-motion is honored via globals.css.
 */
export function AuthMount({
  children,
  className = "",
  variant = "form",
}: {
  children: ReactNode;
  className?: string;
  variant?: "form" | "fade";
}) {
  const motionClass = variant === "form" ? "animate-crease-rise" : "animate-crease-fade";
  return <div className={`${motionClass} ${className}`}>{children}</div>;
}
