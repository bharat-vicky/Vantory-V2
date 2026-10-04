export function previewPageCount(width: number, height: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 1;
  // CSS mm-to-pixel rounding and borders can make an A4 box slightly taller
  // than its computed ratio. Do not turn that into an empty second page.
  return Math.max(1, Math.ceil((height - 2) / (width * 297 / 210)));
}
