import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBudget(min?: number, max?: number): string | null {
    if (!min && !max) return null;
    const fmt = (n: number) =>
        n >= 10_000_000
            ? `PKR ${(n / 10_000_000).toFixed(1)}Cr`
            : n >= 100_000
                ? `PKR ${(n / 100_000).toFixed(0)}L`
                : `PKR ${n.toLocaleString()}`;
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    if (max) return `Up to ${fmt(max)}`;
    return `From ${fmt(min!)}`;
}
