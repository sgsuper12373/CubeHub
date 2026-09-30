"use client";

import { useState, useTransition, useCallback } from "react";
import {
  saveAlgorithmCase,
  deleteAlgorithmCase,
  saveAlgorithm,
  deleteAlgorithm,
} from "@/lib/admin/actions";
import { validateAndNormalizeAlg, setupMovesToFaceletString } from "@/lib/admin/cube-state-utils";
import { CubePainter } from "@/components/admin/cube-painter";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Wand2,
  Check,
  X,
  Loader2,
  Plus,
  Trash2,
  Star,
  AlertTriangle,
  ArrowRight,
  Palette,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AlgorithmData {
  id: string;
  moves: string;
  is_main: boolean;
  is_approved: boolean;
  label: string | null;
}

interface CaseData {
  id?: string;
  puzzle_type: string;
  subset: string;
  case_number: string | number;
  name: string;
  description: string | null;
  setup_moves: string | null;
  cube_state: string;
  thumbnail_url?: string | null;
  algorithms?: AlgorithmData[];
}

// ─── Inline Toast ────────────────────────────────────────────────────────────

function InlineMessage({
  type,
  message,
  onDismiss,
}: {
  type: "success" | "error" | "info";
  message: string;
  onDismiss?: () => void;
}) {
  const styles = {
    success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    error: "bg-red-500/10 border-red-500/30 text-red-400",
    info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  };

  const icons = {
    success: <Check className="h-4 w-4 shrink-0" />,
    error: <AlertTriangle className="h-4 w-4 shrink-0" />,
    info: <Wand2 className="h-4 w-4 shrink-0" />,
  };

  return (
    <div
      className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md border ${styles[type]} animate-in fade-in slide-in-from-top-1 duration-200`}
    >
      {icons[type]}
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="opacity-60 hover:opacity-100">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Add Algorithm Dialog ────────────────────────────────────────────────────

function AddAlgorithmForm({
  onSubmit,
  onCancel,
  isPending,
}: {
  onSubmit: (moves: string, label: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [moves, setMoves] = useState("");
  const [label, setLabel] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setValidating(true);
    setValidationError(null);

    const result = await validateAndNormalizeAlg(moves);
    setValidating(false);

    if (!result.valid) {
      setValidationError(result.error);
      return;
    }
    onSubmit(result.normalized, label);
  };

  return (
    <div className="p-4 bg-muted/40 border border-border/50 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
      <p className="text-sm font-semibold text-foreground/80">
        Add New Algorithm
      </p>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Moves (cube notation)
        </Label>
        <Input
          value={moves}
          onChange={(e) => setMoves(e.target.value)}
          placeholder="e.g. R U2 R2 F R F' U2 R' F R F'"
          className="font-mono text-sm"
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Label (optional)
        </Label>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Beginner-friendly, finger-trick optimized"
          className="text-sm"
        />
      </div>
      {validationError && (
        <InlineMessage type="error" message={validationError} />
      )}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isPending || validating || !moves.trim()}
        >
          {validating ? (
            <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5 mr-2" />
          )}
          Add
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Main Editor Component ───────────────────────────────────────────────────

export function AlgorithmCaseEditor({
  initialData,
}: {
  initialData?: CaseData;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<CaseData>(
    initialData || {
      puzzle_type: "333",
      subset: "OLL",
      case_number: "",
      name: "",
      description: "",
      setup_moves: "",
      cube_state: "",
      thumbnail_url: "",
    }
  );
  const [showAddAlg, setShowAddAlg] = useState(false);
  const [showPainter, setShowPainter] = useState(false);
  const [stateMessage, setStateMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ── Generate State from Setup Moves ──────────────────────────────────────

  const handleGenerateState = useCallback(async () => {
    const setupMoves = formData.setup_moves;
    if (!setupMoves?.trim()) {
      setStateMessage({
        type: "error",
        text: "Enter setup moves first, then click Generate.",
      });
      return;
    }

    setIsGenerating(true);
    setStateMessage(null);

    // First validate the setup moves using our utility
    const result = await validateAndNormalizeAlg(setupMoves);

    if (!result.valid) {
      setIsGenerating(false);
      setStateMessage({
        type: "error",
        text: `Invalid algorithm notation: ${result.error}`,
      });
      return;
    }

    try {
      // Use the utility function to generate the 54-character facelet string
      const faceletString = await setupMovesToFaceletString(result.normalized);

      setFormData((prev) => ({
        ...prev,
        cube_state: faceletString,
        setup_moves: result.normalized,
      }));
      setIsGenerating(false);
      setStateMessage({
        type: "success",
        text: "Cube state generated & validated successfully!",
      });
    } catch (e: unknown) {
      setIsGenerating(false);
      const message = e instanceof Error ? e.message : "Unknown error generating facelet string.";
      setStateMessage({
        type: "error",
        text: `Failed to generate state: ${message}`,
      });
    }
  }, [formData.setup_moves]);

  // ── Save / Delete Case ───────────────────────────────────────────────────

  const handleSave = () => {
    if (!formData.cube_state?.trim()) {
      setStateMessage({
        type: "error",
        text: "Cube State is required. Use the Generate button or enter it manually.",
      });
      return;
    }
    startTransition(async () => {
      try {
        const id = await saveAlgorithmCase(formData);
        if (!initialData?.id) {
          router.push(`/master-access/algorithms/${id}`);
        } else {
          router.refresh();
        }
      } catch (e) {
        setStateMessage({
          type: "error",
          text: "Failed to save case. Check the console for details.",
        });
        console.error(e);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this case and all its algorithms?")) return;
    startTransition(async () => {
      try {
        await deleteAlgorithmCase(initialData!.id!);
        router.push("/master-access/algorithms");
      } catch {
        setStateMessage({ type: "error", text: "Failed to delete case." });
      }
    });
  };

  // ── Algorithm CRUD ───────────────────────────────────────────────────────

  const handleAddAlg = (moves: string, label: string) => {
    setShowAddAlg(false);
    startTransition(async () => {
      await saveAlgorithm({
        case_id: initialData!.id,
        moves,
        label: label || null,
        is_main: !initialData?.algorithms || initialData.algorithms.length === 0,
      });
      router.refresh();
    });
  };

  const handleDeleteAlg = (id: string) => {
    if (!confirm("Remove this algorithm?")) return;
    startTransition(async () => {
      await deleteAlgorithm(id);
      router.refresh();
    });
  };

  const handleMakeMain = (_alg: AlgorithmData) => {
    startTransition(async () => {
      alert(
        "To change the main algorithm, please delete the current main and re-add the new one marked as main. (A proper swap requires a database transaction we'll add later.)"
      );
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* ──────────────── Left Column: Form ──────────────── */}
      <div className="lg:col-span-2 space-y-6">
        {/* ── Basic Information ── */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-xl">Basic Information</CardTitle>
            <CardDescription>
              Define the puzzle type, subset (like OLL or PLL), and case
              identity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Puzzle Type</Label>
                <Input
                  name="puzzle_type"
                  value={formData.puzzle_type}
                  onChange={handleChange}
                  placeholder="e.g. 333"
                />
                <p className="text-[11px] text-muted-foreground/60">
                  WCA puzzle ID — 333 for 3×3, 222 for 2×2.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Subset</Label>
                <Input
                  name="subset"
                  value={formData.subset}
                  onChange={handleChange}
                  placeholder="e.g. OLL, PLL, F2L"
                />
                <p className="text-[11px] text-muted-foreground/60">
                  The algorithm group this case belongs to.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Case Number</Label>
                <Input
                  name="case_number"
                  type="number"
                  value={formData.case_number}
                  onChange={handleChange}
                  placeholder="e.g. 1"
                />
                <p className="text-[11px] text-muted-foreground/60">
                  Standard numbering (OLL 1, PLL Aa, etc.).
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  Display Name{" "}
                  <span className="text-muted-foreground/40">(optional)</span>
                </Label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Sune, T-Perm"
                />
                <p className="text-[11px] text-muted-foreground/60">
                  Human-readable name shown to users.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">
                Description{" "}
                <span className="text-muted-foreground/40">(optional)</span>
              </Label>
              <Textarea
                name="description"
                value={formData.description || ""}
                onChange={handleChange}
                placeholder="A brief description of how to recognize this case, e.g. 'Dot — all four yellow corners are wrong'..."
                className="resize-y min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Visualization & State ── */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-xl">
              Visualization & Cube State
            </CardTitle>
            <CardDescription>
              Enter setup moves and auto-generate the cube state for the 2D
              visualisation. The &quot;Generate&quot; button validates your
              notation and fills in the cube state.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Setup Moves + Generate Button */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                Setup Moves
                <span className="text-muted-foreground/40"> (optional)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  name="setup_moves"
                  value={formData.setup_moves || ""}
                  onChange={handleChange}
                  placeholder="e.g. F R' F' R U2 F R' F' R2 U2 R'"
                  className="font-mono flex-1"
                />
                <Button
                  variant="secondary"
                  onClick={handleGenerateState}
                  disabled={isGenerating || !formData.setup_moves?.trim()}
                  className="shrink-0 gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  Generate State
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPainter(true)}
                  className="shrink-0 gap-2"
                >
                  <Palette className="h-4 w-4" />
                  Paint Cube
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground/60">
                The inverse of the solution algorithm — moves that set up this
                case from a solved cube.
              </p>
            </div>

            {/* Inline validation message */}
            {stateMessage && (
              <InlineMessage
                type={stateMessage.type}
                message={stateMessage.text}
                onDismiss={() => setStateMessage(null)}
              />
            )}

            {/* Generated Cube State */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                Cube State{" "}
                <span className="text-red-400 text-xs font-normal">
                  (required)
                </span>
              </Label>
              <Input
                name="cube_state"
                value={formData.cube_state}
                onChange={handleChange}
                placeholder="Auto-generated from setup moves, or paste manually"
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground/60">
                Algorithm notation used to render the 2D cube visualization.
                Click &quot;Generate State&quot; above to auto-fill from setup
                moves.
              </p>
            </div>

            {/* Visual flow indicator */}
            {formData.setup_moves && formData.cube_state && (
              <div className="bg-muted/20 rounded-lg p-3 border border-border/30">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-semibold">Setup Moves</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="font-semibold">Generate</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="font-semibold">Cube State</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="font-semibold text-primary">
                    2D LL View
                  </span>
                </div>
              </div>
            )}
            
            {/* Cube Painter Modal */}
            {showPainter && (
              <CubePainter
                initialState={formData.cube_state || undefined}
                onSave={(newState) => {
                  setFormData((prev) => ({ ...prev, cube_state: newState }));
                  setShowPainter(false);
                  setStateMessage({
                    type: "success",
                    text: "Cube state updated from painter!",
                  });
                }}
                onCancel={() => setShowPainter(false)}
              />
            )}
          </CardContent>
        </Card>

        {/* ── Action Bar ── */}
        <div className="flex items-center gap-4 pt-2 border-t border-border/50">
          <Button
            onClick={handleSave}
            disabled={isPending}
            size="lg"
            className="px-8 gap-2"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {initialData?.id ? "Save Changes" : "Create Case"}
          </Button>
          {initialData?.id && (
            <Button
              variant="outline"
              className="text-destructive border-destructive/20 hover:bg-destructive/10 gap-2"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4" />
              Delete Case
            </Button>
          )}
        </div>
      </div>

      {/* ──────────────── Right Column: Algorithms ──────────────── */}
      <div className="lg:col-span-1">
        {initialData?.id ? (
          <Card className="border-border/50 shadow-sm sticky top-6">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Algorithms</CardTitle>
                  <CardDescription className="mt-1">
                    {initialData.algorithms?.length || 0} algorithm
                    {(initialData.algorithms?.length || 0) !== 1 ? "s" : ""}{" "}
                    added.
                  </CardDescription>
                </div>
                {!showAddAlg && (
                  <Button
                    size="sm"
                    onClick={() => setShowAddAlg(true)}
                    disabled={isPending}
                    className="gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Add Algorithm Form */}
              {showAddAlg && (
                <div className="p-3 border-b border-border/30">
                  <AddAlgorithmForm
                    onSubmit={handleAddAlg}
                    onCancel={() => setShowAddAlg(false)}
                    isPending={isPending}
                  />
                </div>
              )}

              {/* Algorithm List */}
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {initialData.algorithms?.map(
                  (alg: AlgorithmData, index: number) => (
                    <div
                      key={alg.id}
                      className="p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground/60 tabular-nums">
                            #{index + 1}
                          </span>
                          {alg.is_main && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
                              <Star className="h-2.5 w-2.5" />
                              Main
                            </span>
                          )}
                          {alg.label && (
                            <span className="text-[10px] text-muted-foreground/50 italic">
                              {alg.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {!alg.is_main && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[11px] px-2"
                              onClick={() => handleMakeMain(alg)}
                            >
                              Set Main
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDeleteAlg(alg.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <code className="block w-full p-2.5 bg-background border border-border/50 rounded text-sm font-semibold tracking-wide font-mono break-all leading-relaxed">
                        {alg.moves}
                      </code>
                    </div>
                  )
                )}
                {(!initialData.algorithms ||
                  initialData.algorithms.length === 0) && (
                  <div className="p-10 text-center">
                    <div className="h-12 w-12 mx-auto mb-3 bg-muted/30 rounded-full flex items-center justify-center">
                      <Plus className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      No algorithms yet
                    </p>
                    <p className="text-xs text-muted-foreground/50 mb-4">
                      Add the solution algorithm(s) for this case.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddAlg(true)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add first algorithm
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-muted/10 border-dashed border-border/30">
            <CardContent className="p-10 text-center text-muted-foreground/70 flex flex-col items-center justify-center min-h-[300px]">
              <div className="h-14 w-14 bg-muted/20 rounded-full flex items-center justify-center mb-4">
                <ArrowRight className="h-6 w-6 text-muted-foreground/30" />
              </div>
              <p className="font-medium mb-1">Create the case first</p>
              <p className="text-xs text-muted-foreground/50">
                Fill out the form and click &quot;Create Case&quot; to start
                adding algorithms.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
