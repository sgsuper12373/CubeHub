/**
 * Home's columns (docs/home-plan.md → Layout): the main column, at most
 * 880 px, two cards across from lg; the 300 px right rail from xl. Below xl
 * the rail's cards follow the main column's.
 */
export function HomeGrid({ main, rail }: { main: React.ReactNode; rail: React.ReactNode }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,880px)_300px] xl:items-start">
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">{main}</div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-1">{rail}</div>
    </div>
  );
}
