import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings — CubeHub",
};

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-2 text-muted-foreground">
        Account and preferences arrive with authentication.
      </p>
    </div>
  );
}
