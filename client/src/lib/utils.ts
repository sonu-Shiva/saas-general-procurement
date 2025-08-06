import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: string | number | undefined): string {
  if (!amount) return "₹0";
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return "₹0";
  return `₹${numAmount.toLocaleString('en-IN', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 2 
  })}`;
}

export function formatCurrencyInput(amount: string | number | undefined): string {
  if (!amount) return "";
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return "";
  return numAmount.toString();
}
