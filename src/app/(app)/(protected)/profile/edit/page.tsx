import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";

import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getEditableProfile } from "@/lib/profile/dal";

export const metadata: Metadata = { title: "Edit profile — CubeHub" };

/** Edit your own profile. The (protected) layout already sends signed-out visitors to log in. */
export default async function EditProfilePage() {
  const profile = await getEditableProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent("/profile/edit")}`);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <Link
        href="/profile"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-3 text-muted-foreground")}
      >
        <ChevronLeft />
        Back to profile
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Edit profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything others see about you, and who can see it. Timer options are in{" "}
          <Link href="/settings" className="text-primary hover:underline">
            Settings
          </Link>
          .
        </p>
      </div>
      <ProfileEditForm profile={profile} />
    </div>
  );
}
