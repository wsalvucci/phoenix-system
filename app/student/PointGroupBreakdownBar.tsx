export default function PointGroupBreakdownBar({
    segments,
    height = 14
}: {
    segments: { color: string; value: number }[];
    height?: number;
}) {
    const nonZero = (segments || []).filter(s => (s?.value ?? 0) > 0);
    const total = nonZero.reduce((acc, s) => acc + s.value, 0);

    if (!nonZero.length || total <= 0) return null;

    return (
        <div
            className="w-full overflow-hidden rounded-full ring-1 ring-border"
            style={{ height }}
            aria-label="Point distribution by point group"
            role="img"
        >
            <div className="flex w-full h-full">
                {nonZero.map((s, idx) => {
                    const widthPct = (s.value / total) * 100;
                    return (
                        <div
                            key={idx}
                            style={{ width: `${widthPct}%`, backgroundColor: s.color }}
                        />
                    );
                })}
            </div>
        </div>
    );
}


