import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop — CubeHub",
};

export default function ShopPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <h1 className="text-3xl font-semibold tracking-tight">Shop</h1>
      <p className="mt-2 text-muted-foreground">
        Cube recommendations arrive in Phase 3.
      </p>
    </div>
  );
}
