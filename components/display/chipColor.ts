// A point-group color is user-entered. Accept only a hex value, and derive a readable label color
// from tokens (never a literal) by comparing WCAG contrast against both candidates.
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function luminance(hex: string): number {
  const h = hex.length === 4 ? [...hex.slice(1)].map((c) => c + c).join("") : hex.slice(1);
  const c = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function chipColors(color: string | null | undefined): { background: string; color: string } | null {
  if (!color || !HEX.test(color)) return null;
  const l = luminance(color);
  // Dark ink luminance is about 0.01, light ink about 0.95.
  const dark = (l + 0.05) / 0.06;
  const light = 1.0 / (l + 0.05);
  return {
    background: color,
    color: dark >= light ? "hsl(var(--gilt-foreground))" : "hsl(var(--seal-foreground))",
  };
}
