"use client";

import { useSyncExternalStore } from "react";

import { greeting } from "@/lib/home/cards";

const noop = () => () => {};

/**
 * The page's h1. Time of day is the visitor's own clock, so it's filled in on
 * the client; the server renders "Hi, Name" (no hour to go on).
 */
export function HomeGreeting({ name }: { name: string | null }) {
  const hour = useSyncExternalStore(noop, () => new Date().getHours(), () => null);
  const date = hour === null ? null : new Date(2000, 0, 1, hour);
  return <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{greeting(name, date)}</h1>;
}
