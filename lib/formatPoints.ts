/** Display text for a point change: "+5", "-5", "0". Uses a real minus sign only via the number itself. */
export function formatSignedPoints(value: number): string {
    if (value > 0) return `+${value}`;
    if (value < 0) return `-${Math.abs(value)}`;
    return "0";
}
