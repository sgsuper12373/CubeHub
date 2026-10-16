"use client";

import { Menu } from "@base-ui/react/menu";
import { Flag, MoreHorizontal } from "lucide-react";
import { useState } from "react";

import { ReportDialog } from "@/components/social/report-dialog";
import { Button } from "@/components/ui/button";
import { reportClubContent } from "@/lib/clubs/actions";
import { CLUB_REPORT_REASONS } from "@/lib/clubs/posts";

/** The ⋯ next to Join/Leave: report the club itself. */
export function ClubReportMenu({ clubId, name }: { clubId: string; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Menu.Root>
        <Menu.Trigger render={<Button variant="outline" size="icon-sm" aria-label="More club actions" />}>
          <MoreHorizontal />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="end" sideOffset={4} className="isolate z-50">
            <Menu.Popup className="min-w-40 rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden">
              <Menu.Item
                onClick={() => setOpen(true)}
                className="flex cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 outline-none data-highlighted:bg-muted"
              >
                <Flag className="size-4" aria-hidden />
                Report club
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <ReportDialog
        open={open}
        onOpenChange={setOpen}
        title={`Report ${name}`}
        description="Reports are private and go to the CubeHub team. The club's admins aren't told who sent one."
        reasons={CLUB_REPORT_REASONS}
        onSubmit={(reason, note) => reportClubContent({ clubId }, reason, note)}
      />
    </>
  );
}
