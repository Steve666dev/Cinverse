import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function Button({
  className = "",
  variant = "default",
  size = "default",
  children,
  ...props
}: ButtonProps) {
  const variantStyles = {
    default: "bg-white text-black hover:bg-neutral-200",
    outline: "border border-neutral-700 bg-transparent text-white hover:bg-neutral-800",
    ghost: "bg-transparent text-white hover:bg-neutral-800",
    link: "text-white underline-offset-4 hover:underline",
  }[variant];

  const sizeStyles = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-10 rounded-md px-8",
    icon: "h-9 w-9",
  }[size];

  return (
    <button
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 disabled:pointer-events-none disabled:opacity-50 ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function buttonVariants({ variant = "default", size = "default" }: { variant?: string; size?: string } = {}) {
  return `inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors ${variant} ${size}`;
}

