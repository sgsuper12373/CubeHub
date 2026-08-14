import { getAllAlgorithmCases } from "@/lib/admin/dal";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Plus, BookOpen, Layers, Settings2, Grid3X3 } from "lucide-react";

export default async function AdminAlgorithmsPage() {
  const cases = await getAllAlgorithmCases();
  
  // Group cases by puzzle_type -> subset
  const grouped: Record<string, Record<string, typeof cases>> = {};
  let totalCases = 0;
  let totalAlgorithms = 0;
  
  for (const c of cases) {
    totalCases++;
    totalAlgorithms += c.algorithms.length;
    if (!grouped[c.puzzle_type]) grouped[c.puzzle_type] = {};
    if (!grouped[c.puzzle_type][c.subset]) grouped[c.puzzle_type][c.subset] = [];
    grouped[c.puzzle_type][c.subset].push(c);
  }

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">Algorithm Cases</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Manage your puzzle collections, subsets, and the individual algorithm cases. This is the master database that drives the Learn tab.
          </p>
        </div>
        <Button asChild size="lg" className="shrink-0">
          <Link href="/master-access/algorithms/new">
            <Plus className="mr-2 h-5 w-5" />
            Create New Case
          </Link>
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Grid3X3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Puzzles</p>
                <h3 className="text-2xl font-bold">{Object.keys(grouped).length}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Layers className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Cases</p>
                <h3 className="text-2xl font-bold">{totalCases}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Settings2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Algorithms</p>
                <h3 className="text-2xl font-bold">{totalAlgorithms}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database Listing */}
      <div className="space-y-12">
        {Object.entries(grouped).map(([puzzleType, subsets]) => (
          <div key={puzzleType} className="space-y-6">
            <div className="flex items-center gap-3 border-b pb-4">
              <div className="h-10 w-10 bg-foreground text-background rounded flex items-center justify-center font-bold">
                {puzzleType}
              </div>
              <h2 className="text-3xl font-bold tracking-tight">Puzzle</h2>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(subsets).map(([subset, subsetCases]) => (
                <Card key={subset} className="flex flex-col border-border/50 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="bg-muted/30 pb-4 border-b">
                    <div className="flex items-center justify-between">
                      <CardTitle className="uppercase tracking-widest text-lg text-primary">{subset}</CardTitle>
                      <span className="bg-background px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm border border-border/50">
                        {subsetCases.length} cases
                      </span>
                    </div>
                    <CardDescription>
                      Algorithm subset group
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 flex-1">
                    <div className="divide-y max-h-[350px] overflow-y-auto">
                      {subsetCases.map((c) => (
                        <Link 
                          key={c.id} 
                          href={`/master-access/algorithms/${c.id}`}
                          className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group"
                        >
                          <div className="min-w-0 pr-4">
                            <h4 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                              {c.name || `${subset} ${c.case_number}`}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {c.description ? c.description : "No description"}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex flex-col items-end">
                              <span className="text-xs font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                                {c.algorithms.length} {c.algorithms.length === 1 ? 'alg' : 'algs'}
                              </span>
                            </div>
                            <Button variant="ghost" size="sm" className="hidden sm:flex h-8 px-2">Edit</Button>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
        {cases.length === 0 && (
          <div className="text-center py-24 border-2 border-dashed border-border/50 rounded-xl bg-muted/10">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Your Database is Empty</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              You haven't created any algorithm cases yet. Start by creating your first puzzle case (like OLL or PLL).
            </p>
            <Button asChild size="lg">
              <Link href="/master-access/algorithms/new">
                <Plus className="mr-2 h-4 w-4" /> Create First Case
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
