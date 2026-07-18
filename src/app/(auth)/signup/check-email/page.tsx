import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Confirm your email — CubeHub",
};

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="size-5" />
        </div>
        <CardTitle className="text-lg">Check your email</CardTitle>
        <CardDescription>
          We sent a confirmation link{email ? ` to ${email}` : ""}. Click it to
          activate your account, then sign in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Didn&apos;t get it? Check your spam folder, or{" "}
          <Link href="/signup" className="text-primary hover:underline">
            try again
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
