"use client";

import { ChevronDown, LogIn, PanelLeftClose, PanelLeftOpen, PanelLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { CubeMark, Logo } from "@/components/layout/logo";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { NotificationBell } from "@/components/social/notification-bell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { signOut } from "@/lib/auth/actions";
import type { CurrentProfile } from "@/lib/auth/dal";
import type { LearnNavPuzzle } from "@/lib/learn/public-dal";
import {
  activeNavHref,
  NAV_GROUP_LABEL,
  sidebarFooterItems,
  sidebarItems,
  type NavGroup,
  type NavItem,
} from "@/lib/navigation";
import type { NotificationItem } from "@/lib/notifications/types";
import {
  sidebarGroupFor,
  sidebarMode,
  toggleHidden,
  toggleRail,
  type SidebarPrefs,
  type SidebarState,
} from "@/lib/sidebar";
import { cn } from "@/lib/utils";
import { useOverlayLock } from "@/stores/overlay-store";
import { useSidebarStore } from "@/stores/sidebar-store";

const LG_QUERY = "(min-width: 1024px)";
const PEEK_OPEN_MS = 150;
const PEEK_CLOSE_MS = 300;

function subscribeLg(onChange: () => void) {
  const query = window.matchMedia(LG_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** True from lg up. The server assumes a desktop; CSS keeps the first paint right either way. */
function useIsLg(): boolean {
  return useSyncExternalStore(
    subscribeLg,
    () => window.matchMedia(LG_QUERY).matches,
    () => true,
  );
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

const GROUP_ORDER: NavGroup[] = ["main", "practice", "community"];

/**
 * The app's left sidebar (docs/app-shell-plan.md → The sidebar): Expanded
 * (232 px), Rail (64 px, icons with tooltips) or Hidden (an edge hover zone
 * and a small button bring it back). The choice is remembered per page group
 * in the `cubehub-sidebar` cookie, which the (app) layout reads so the first
 * paint already has the right width.
 *
 * A sibling of the page's <main>, never inside <TouchStage/>. `data-focus-hide`
 * hides it, the hover zone and the show button while Focus mode is solving.
 */
export function AppSidebar({
  profile,
  notifications,
  initialPrefs,
  learnNav,
}: {
  profile: CurrentProfile | null;
  notifications: { items: NotificationItem[]; unread: number };
  initialPrefs: SidebarPrefs;
  learnNav: LearnNavPuzzle[];
}) {
  const pathname = usePathname();
  const seeded = useSidebarStore((s) => s.seeded);
  const storePrefs = useSidebarStore((s) => s.prefs);
  const seed = useSidebarStore((s) => s.seed);
  const setState = useSidebarStore((s) => s.set);
  const isLg = useIsLg();

  useEffect(() => seed(initialPrefs), [seed, initialPrefs]);

  const prefs = seeded ? storePrefs : initialPrefs;
  const group = sidebarGroupFor(pathname);
  const mode = sidebarMode(prefs, group);
  /** What shows when not hidden, with "auto" resolved by width. */
  const visible: SidebarState = mode === "auto" ? (isLg ? "expanded" : "rail") : mode;
  const rail = visible === "rail";

  // Hover-to-peek while hidden: an overlay, so the page doesn't shift.
  const [peek, setPeek] = useState(false);
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schedulePeek = (open: boolean) => {
    if (peekTimer.current) clearTimeout(peekTimer.current);
    peekTimer.current = setTimeout(() => setPeek(open), open ? PEEK_OPEN_MS : PEEK_CLOSE_MS);
  };
  useEffect(() => () => {
    if (peekTimer.current) clearTimeout(peekTimer.current);
  }, []);
  const showPeek = mode === "hidden" && peek;

  const lastVisibleFor = () => useSidebarStore.getState().lastVisible[group] ?? (isLg ? "expanded" : "rail");

  // Ctrl/⌘+B hides and restores; Ctrl/⌘+\ switches Expanded and Rail. Never
  // while typing, and never while a solve is under way (the timer sets the lock).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      if (e.key !== "b" && e.key !== "B" && e.key !== "\\") return;
      if (isTyping(e.target) || useSidebarStore.getState().shortcutsLocked) return;
      if (!window.matchMedia("(min-width: 768px)").matches) return;
      e.preventDefault();
      const current = sidebarMode(useSidebarStore.getState().prefs, group);
      if (e.key === "\\") {
        setState(group, toggleRail(current === "hidden" ? "hidden" : visible));
      } else {
        const next = toggleHidden(current, lastVisibleFor());
        setState(group, next, next === "hidden" ? visible : undefined);
        setPeek(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const activeHref = activeNavHref(pathname, sidebarItems, profile?.username ?? null);
  const panelState: SidebarState | "auto" = showPeek ? "expanded" : mode;

  return (
    <TooltipProvider delay={300}>
      {mode === "hidden" && (
        <>
          {/* The edge hover zone and the show button. */}
          <div
            aria-hidden
            data-focus-hide
            className="fixed inset-y-0 left-0 z-40 hidden w-2 md:block"
            onPointerEnter={() => schedulePeek(true)}
            onPointerLeave={() => schedulePeek(false)}
          />
          <button
            type="button"
            data-focus-hide
            onClick={() => setState(group, lastVisibleFor())}
            aria-label="Show sidebar"
            title="Show sidebar (Ctrl+B)"
            className="fixed top-3 left-3 z-40 hidden size-8 items-center justify-center rounded-md border border-sidebar-border bg-sidebar text-sidebar-foreground/70 shadow-sm hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none md:flex"
          >
            <PanelLeftOpen className="size-4" />
          </button>
        </>
      )}
      <aside
        data-sidebar-state={panelState}
        data-focus-hide
        onPointerEnter={showPeek ? () => schedulePeek(true) : undefined}
        onPointerLeave={showPeek ? () => schedulePeek(false) : undefined}
        className={cn(
          "app-sidebar sticky top-0 z-30 hidden h-svh shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex",
          "transition-[width] duration-200 ease-out motion-reduce:transition-none",
          showPeek && "fixed inset-y-0 left-0 z-50 shadow-xl",
        )}
      >
        <div className="flex h-14 shrink-0 items-center px-3.5">
          <Link href="/home" aria-label="CuberHub home" className="flex min-w-0 items-center rounded-md">
            {rail && !showPeek ? <CubeMark className="size-8" /> : <Logo />}
          </Link>
        </div>

        <nav aria-label="Main" data-tour="sidebar" className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2.5 py-2">
          {GROUP_ORDER.map((g) => {
            const items = sidebarItems.filter((i) => i.group === g);
            const heading = NAV_GROUP_LABEL[g];
            return (
              <div key={g} className="flex flex-col gap-0.5">
                {heading && (
                  <>
                    <p className="sidebar-label px-2.5 pb-1 text-xs font-medium text-sidebar-foreground/55">{heading}</p>
                    <div className="sidebar-rail-only mx-2.5 mb-1 border-t border-sidebar-border" aria-hidden />
                  </>
                )}
                {items.map((item) =>
                  item.href === "/learn" && learnNav.length > 0 ? (
                    <LearnItem
                      key={item.href}
                      item={item}
                      active={item.href === activeHref}
                      rail={rail && !showPeek}
                      learnNav={learnNav}
                      pathname={pathname}
                    />
                  ) : (
                    <SidebarLink key={item.href} item={item} active={item.href === activeHref} rail={rail && !showPeek} />
                  ),
                )}
              </div>
            );
          })}
        </nav>

        <div className="flex shrink-0 flex-col gap-0.5 border-t border-sidebar-border px-2.5 py-2">
          {profile && (
            <NotificationBell
              items={notifications.items}
              unread={notifications.unread}
              side="right"
              label
              className="h-9 w-full justify-start gap-2.5 px-2.5 font-medium text-sidebar-foreground/80 hover:text-sidebar-foreground"
            />
          )}
          {/* Cubby's slot (docs/app-shell-plan.md → Cubby slot): renders nothing until the companion ships. */}
          {sidebarFooterItems.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
              rail={rail && !showPeek}
            />
          ))}
          {profile ? (
            <AccountMenu profile={profile} rail={rail && !showPeek} />
          ) : (
            <SidebarLink
              item={{ label: "Sign in", href: "/login", icon: LogIn }}
              active={false}
              rail={rail && !showPeek}
            />
          )}
          <div className="mt-1 flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setState(group, rail ? "expanded" : "rail")}
              aria-label={rail ? "Expand sidebar" : "Collapse sidebar to icons"}
              title={`${rail ? "Expand sidebar" : "Collapse sidebar"} (Ctrl+\\)`}
              className="flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-md px-2.5 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
            >
              {rail ? <PanelLeft className="size-4 shrink-0" /> : <PanelLeftClose className="size-4 shrink-0" />}
              <span className="sidebar-label truncate">Collapse</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setState(group, "hidden", visible);
                setPeek(false);
              }}
              aria-label="Hide sidebar"
              title="Hide sidebar (Ctrl+B)"
              className="sidebar-expanded-only flex size-9 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
            >
              <PanelLeftOpen className="size-4 rotate-180" />
            </button>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

const ITEM =
  "flex h-9 min-w-0 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none";

function itemClass(active: boolean) {
  return cn(
    ITEM,
    active
      ? "bg-sidebar-accent text-sidebar-primary"
      : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  );
}

function SidebarLink({ item, active, rail }: { item: NavItem; active: boolean; rail: boolean }) {
  const Icon = item.icon;
  return (
    <Tooltip disabled={!rail}>
      <TooltipTrigger
        render={
          <Link href={item.href} aria-current={active ? "page" : undefined} className={itemClass(active)} />
        }
      >
        <Icon className="size-4 shrink-0" />
        <span className="sidebar-label truncate">{item.label}</span>
      </TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

/** Learn with its puzzles and series: an accordion when expanded, a flyout in the rail. */
function LearnItem({
  item,
  active,
  rail,
  learnNav,
  pathname,
}: {
  item: NavItem;
  active: boolean;
  rail: boolean;
  learnNav: LearnNavPuzzle[];
  pathname: string;
}) {
  const onLearn = active;
  const [open, setOpen] = useState(onLearn);
  const [menuOpen, setMenuOpen] = useState(false);
  useOverlayLock(menuOpen);
  // Follow navigation into and out of Learn.
  const [wasOnLearn, setWasOnLearn] = useState(onLearn);
  if (wasOnLearn !== onLearn) {
    setWasOnLearn(onLearn);
    setOpen(onLearn);
  }
  const Icon = item.icon;

  if (rail) {
    return (
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          openOnHover
          delay={100}
          aria-label={item.label}
          className={cn(itemClass(active), "w-full")}
        >
          <Icon className="size-4 shrink-0" />
          <span className="sidebar-label truncate">{item.label}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-56">
          <DropdownMenuItem render={<Link href="/learn" />}>All of Learn</DropdownMenuItem>
          {learnNav.map((p) => (
            <DropdownMenuGroup key={p.puzzle}>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{p.name}</DropdownMenuLabel>
              {p.series.map((s) => (
                <DropdownMenuItem key={s.slug} render={<Link href={`/learn/${p.puzzle}/${s.slug}`} />}>
                  {s.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center">
        <Link
          href={item.href}
          aria-current={pathname === item.href ? "page" : undefined}
          className={cn(itemClass(active), "flex-1")}
        >
          <Icon className="size-4 shrink-0" />
          <span className="sidebar-label truncate">{item.label}</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="sidebar-learn-children"
          aria-label={open ? "Hide Learn topics" : "Show Learn topics"}
          className="ml-0.5 flex size-9 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
        >
          <ChevronDown className={cn("size-4 transition-transform motion-reduce:transition-none", open && "rotate-180")} />
        </button>
      </div>
      {open && (
        <ul id="sidebar-learn-children" className="mt-0.5 mb-1 ml-[1.15rem] flex flex-col gap-0.5 border-l border-sidebar-border pl-2">
          {learnNav.map((p) => (
            <li key={p.puzzle}>
              <p className="px-2 pt-1 pb-0.5 text-xs font-medium text-sidebar-foreground/55">{p.name}</p>
              <ul className="flex flex-col">
                {p.series.map((s) => {
                  const href = `/learn/${p.puzzle}/${s.slug}`;
                  const here = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <li key={s.slug}>
                      <Link
                        href={href}
                        aria-current={here ? "page" : undefined}
                        className={cn(
                          "block truncate rounded-md px-2 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none",
                          here
                            ? "bg-sidebar-accent font-medium text-sidebar-primary"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                      >
                        {s.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The account row: avatar and name, opening Profile, Edit profile and Sign out. */
function AccountMenu({ profile, rail }: { profile: CurrentProfile; rail: boolean }) {
  const [open, setOpen] = useState(false);
  useOverlayLock(open);
  const formRef = useRef<HTMLFormElement>(null);
  const name = profile.display_name || profile.username;

  return (
    <>
      <form ref={formRef} action={signOut} hidden />
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          aria-label={`Account: ${name}`}
          className={cn(ITEM, "w-full px-1.5 text-sidebar-foreground hover:bg-sidebar-accent", rail && "justify-center")}
        >
          <ProfileAvatar url={profile.avatar_url} name={name} size="xs" className="size-7 rounded-md text-[10px]" />
          <span className="sidebar-label min-w-0 flex-1 truncate text-left">{name}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="end" className="w-48">
          <DropdownMenuLabel className="truncate">@{profile.username}</DropdownMenuLabel>
          <DropdownMenuItem render={<Link href="/profile" />}>Profile</DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/profile/edit" />}>Edit profile</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => formRef.current?.requestSubmit()}>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
