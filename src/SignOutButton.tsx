"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { LogOut } from "lucide-react";
import { useTheme } from "./contexts/ThemeContext";

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const { isDarkMode } = useTheme();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <button
      onClick={() => void signOut()}
      className={`px-6 py-3 rounded-2xl border-2 font-bold text-sm transition-all flex items-center space-x-2 ${
        isDarkMode
          ? 'border-white text-white hover:bg-white hover:text-black'
          : 'border-black text-black hover:bg-black hover:text-white'
      }`}
    >
      <LogOut className="w-4 h-4" />
      <span>Sign Out</span>
    </button>
  );
}
