import { getAlgorithmCaseById } from "@/lib/learn/dal";
import { requireAdmin } from "@/lib/auth/dal";
import { AlgorithmCaseEditor } from "@/components/admin/algorithm-case-editor";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminAlgorithmCasePage({ params }: Props) {
  await requireAdmin();
  const resolvedParams = await params;
  const isNew = resolvedParams.id === "new";
  
  let initialData = null;
  if (!isNew) {
    initialData = await getAlgorithmCaseById(resolvedParams.id);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" render={<Link href="/master-access/algorithms" />} nativeButton={false}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isNew ? "New Algorithm Case" : `Edit Case: ${initialData?.name || initialData?.id}`}
        </h1>
      </div>

      <AlgorithmCaseEditor initialData={initialData ?? undefined} />
    </div>
  );
}
