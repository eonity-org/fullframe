/** Lay out images in reading order without cropping or stretching a sparse final row. */
export function photoRows(
  ratios: number[],
  width: number,
  target: number,
  gap: number,
) {
  const sizes: Array<{ width: number; height: number }> = [];
  if (width <= 0) return sizes;
  const safe = ratios.map((r) => (Number.isFinite(r) && r > 0 ? r : 1));
  let start = 0;
  while (start < safe.length) {
    let end = start + 1;
    let sum = safe[start];
    while (end < safe.length) {
      const current = (width - gap * (end - start - 1)) / sum;
      const next = (width - gap * (end - start)) / (sum + safe[end]);
      if (next <= 0 || Math.abs(current - target) <= Math.abs(next - target))
        break;
      sum += safe[end++];
    }
    const available = Math.max(1, width - gap * (end - start - 1));
    const height =
      end === safe.length ? Math.min(target, available / sum) : available / sum;
    for (let i = start; i < end; i++)
      sizes.push({ width: safe[i] * height, height });
    start = end;
  }
  return sizes;
}
