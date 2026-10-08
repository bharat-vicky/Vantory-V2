// One cancellable deadline per spoken turn. Only recognition results arm it.
export class AnswerPause {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;
  constructor(private schedule = setTimeout, private cancel = clearTimeout) {}
  clear() {
    this.generation++;
    if (this.timer !== undefined) this.cancel(this.timer);
    this.timer = undefined;
  }
  heard(text: string, delayMs: number, finish: () => void) {
    this.clear();
    if (!text.trim()) return;
    const token = this.generation;
    this.timer = this.schedule(() => {
      if (token !== this.generation) return;
      this.timer = undefined;
      this.generation++;
      finish();
    }, delayMs);
  }
}
