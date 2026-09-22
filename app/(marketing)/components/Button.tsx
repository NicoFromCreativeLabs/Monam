import Link from "next/link";
import type { AnchorHTMLAttributes } from "react";

type ButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: "primary" | "outline";
  inverted?: boolean; // use on dark (Ciruela/Oliva/Crepe) sections
};

const base =
  "inline-flex min-h-11 items-center justify-center rounded-full px-8 py-3 font-body text-sm font-medium transition-colors";

export function Button({
  href,
  variant = "primary",
  inverted = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const variantClass =
    variant === "primary"
      ? inverted
        ? "bg-hueso text-ciruela hover:bg-hueso/90"
        : "bg-ciruela text-hueso hover:bg-ciruela/90"
      : inverted
        ? "border border-hueso text-hueso hover:bg-hueso hover:text-ciruela"
        : "border border-ciruela text-ciruela hover:bg-ciruela hover:text-hueso";

  const isExternal = href.startsWith("http") || href.startsWith("https://wa.me");

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} ${variantClass} ${className ?? ""}`}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={`${base} ${variantClass} ${className ?? ""}`}>
      {children}
    </Link>
  );
}
