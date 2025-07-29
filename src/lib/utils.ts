import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Theme utilities for consistent dark mode styling
export const theme = {
  bg: {
    primary: "bg-gray-900",
    secondary: "bg-gray-800", 
    tertiary: "bg-gray-700",
    card: "bg-gray-800 border border-gray-700",
    input: "bg-gray-700 border border-gray-600",
    hover: "hover:bg-gray-700",
    active: "bg-blue-900/30 border border-blue-700/50",
  },
  text: {
    primary: "text-white",
    secondary: "text-gray-300", 
    tertiary: "text-gray-400",
    accent: "text-blue-400",
  },
  button: {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-700 hover:bg-gray-600 text-gray-300",
    ghost: "hover:bg-gray-700 text-gray-300",
  }
};
