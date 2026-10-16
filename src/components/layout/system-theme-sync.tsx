"use client";

import { useEffect } from "react";

import { followSystemTheme } from "@/lib/theme";

/** Re-applies the "system" theme when the OS light/dark setting changes. Renders nothing. */
export function SystemThemeSync() {
  useEffect(() => followSystemTheme(), []);
  return null;
}
