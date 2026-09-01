import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Shadcn UI classname utility.
 * Merges Tailwind classes intelligently (dedupes conflicts)
 * and supports conditional class application via clsx.
 *
 * Usage: cn('px-4 py-2', isActive && 'bg-primary text-white')
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
