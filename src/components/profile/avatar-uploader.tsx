"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { setAvatarUrl } from "@/lib/profile/actions";
import { avatarExtension, prepareAvatar } from "@/lib/profile/avatar";
import { createClient } from "@/lib/supabase/client";

import { ProfileAvatar } from "./profile-avatar";

/**
 * Change or remove the avatar. The image is resized in the browser, uploaded
 * straight to the `avatars` bucket under the user's own folder (the bucket
 * policy enforces that), then the profile is pointed at it. Older files in
 * the folder are removed afterwards so it never holds more than one.
 */
export function AvatarUploader({
  userId,
  name,
  initialUrl,
}: {
  userId: string;
  name: string;
  initialUrl: string | null;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Delete every file in the user's folder except `keep`. */
  const clearOld = async (keep: string | null) => {
    const storage = createClient().storage.from("avatars");
    const { data } = await storage.list(userId);
    const stale = (data ?? []).map((f) => `${userId}/${f.name}`).filter((path) => path !== keep);
    if (stale.length > 0) await storage.remove(stale);
  };

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const blob = await prepareAvatar(file);
      const path = `${userId}/${Date.now()}.${avatarExtension(blob)}`;
      const storage = createClient().storage.from("avatars");
      const { error: uploadError } = await storage.upload(path, blob, {
        contentType: blob.type,
        cacheControl: "31536000",
      });
      if (uploadError) throw new Error("Upload failed. Please try again.");

      const publicUrl = storage.getPublicUrl(path).data.publicUrl;
      const saved = await setAvatarUrl(publicUrl);
      if (saved.error) throw new Error(saved.error);
      setUrl(publicUrl);
      await clearOld(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    const saved = await setAvatarUrl(null);
    if (saved.error) setError(saved.error);
    else {
      setUrl(null);
      await clearOld(null);
    }
    setBusy(false);
  };

  return (
    <div className="flex items-center gap-4">
      <ProfileAvatar url={url} name={name} size="lg" />
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
            <Camera />
            {busy ? "Saving…" : url ? "Change photo" : "Upload photo"}
          </Button>
          {url && (
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void remove()}>
              <Trash2 />
              Remove
            </Button>
          )}
        </div>
        <p className={error ? "text-xs text-destructive" : "text-xs text-muted-foreground"} role={error ? "alert" : undefined}>
          {error ?? "Cropped to a square and resized. JPG, PNG or WebP."}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Choose a profile photo"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void upload(file);
          }}
        />
      </div>
    </div>
  );
}
