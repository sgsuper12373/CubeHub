import { requireAdmin } from "@/lib/auth/dal";
import Link from "next/link";
import { Settings, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default async function MasterAccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin();
  } catch (e) {
    redirect("/");
  }

  return (
    <div className="container max-w-7xl py-8 flex flex-col md:flex-row gap-8">
      {/* Sidebar */}
      <aside className="w-full md:w-64 shrink-0 space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight px-4 mb-4">Master Access</h2>
          <nav className="space-y-1">
            <Button variant="ghost" className="w-full justify-start" asChild>
              <Link href="/master-access/algorithms">
                <BookOpen className="mr-2 h-4 w-4" />
                Algorithm Cases
              </Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start text-muted-foreground" disabled>
              <Settings className="mr-2 h-4 w-4" />
              Settings (Soon)
            </Button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
