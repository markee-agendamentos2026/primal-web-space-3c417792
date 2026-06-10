import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: "primary" | "ghost";
};

export function PrimaryButton({ icon, children, className, variant = "primary", ...rest }: Props) {
  return (
    <button
      {...rest}
      className={cn(
        "flex h-16 w-full items-center justify-center gap-3 px-6 text-base disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" ? "btn-primary" : "btn-ghost-glass",
        className,
      )}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
