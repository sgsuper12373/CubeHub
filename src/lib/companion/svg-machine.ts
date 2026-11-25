import type { CubbyEvent, CubbyInputName, CubbyInputs, CubbyTrigger } from "@/lib/companion/renderer";
import { INITIAL_STATE, reduce, TRIGGER_MS, type SvgAction, type SvgState } from "@/lib/companion/svg-state";

/**
 * The SVG renderer without its drawing: the reducer, a subscribable store
 * for the view (useSyncExternalStore), one-shot timers and renderer events.
 * Kept apart from React so it can be tested on its own.
 */
export class SvgCubbyMachine {
  readonly kind = "svg";
  private state: SvgState = INITIAL_STATE;
  private readonly storeListeners = new Set<() => void>();
  private readonly eventListeners = new Set<(event: CubbyEvent) => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private nextId = 1;
  private destroyed = false;

  getSnapshot = (): SvgState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.storeListeners.add(listener);
    return () => this.storeListeners.delete(listener);
  };

  setInput<K extends CubbyInputName>(name: K, value: CubbyInputs[K]): void {
    this.dispatch({ type: "setInput", name, value });
  }

  fire(trigger: CubbyTrigger): void {
    if (this.destroyed) return;
    const previous = this.state.oneShot;
    const id = this.nextId++;
    if (this.timer) clearTimeout(this.timer);
    if (previous) this.emit({ type: "triggerEnd", trigger: previous.trigger });
    this.dispatch({ type: "fire", trigger, id });
    this.emit({ type: "triggerStart", trigger });
    this.timer = setTimeout(() => {
      this.timer = null;
      this.dispatch({ type: "end", id });
      this.emit({ type: "triggerEnd", trigger });
    }, TRIGGER_MS[trigger]);
  }

  onEvent(cb: (event: CubbyEvent) => void): () => void {
    this.eventListeners.add(cb);
    return () => this.eventListeners.delete(cb);
  }

  destroy(): void {
    this.destroyed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.storeListeners.clear();
    this.eventListeners.clear();
  }

  private dispatch(action: SvgAction): void {
    if (this.destroyed) return;
    const next = reduce(this.state, action);
    if (next === this.state) return;
    this.state = next;
    for (const l of this.storeListeners) l();
  }

  private emit(event: CubbyEvent): void {
    for (const l of this.eventListeners) l(event);
  }
}
