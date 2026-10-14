// Chart colours are tokens (--chart-1..5). Every segment also has a labelled, valued legend line,
// so no information is carried by hue alone. Class names are listed in full for Tailwind.
const strokes = ["stroke-chart-1", "stroke-chart-2", "stroke-chart-3", "stroke-chart-4", "stroke-chart-5"];
const fills = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];

export default function PointDistribution({ categories }: { categories: { name: string; points: number }[] }) {
    const total = categories.reduce((sum, category) => sum + Math.max(0, category.points), 0);
    let offset = 0;
    return <div className="grid items-center gap-6 py-4 sm:grid-cols-[10rem_1fr]">
        <div className="mx-auto w-40 max-w-full">
            <svg viewBox="0 0 200 200" role="img" aria-label="Share of your points by category. Values are listed alongside.">
                <circle cx="100" cy="100" r="77" fill="none" strokeWidth="12" className="stroke-secondary" />
                {categories.map((category, index) => {
                    const fraction = total ? Math.max(0, category.points) / total : 0;
                    const start = offset; offset += fraction * 100;
                    return <circle key={category.name} cx="100" cy="100" r="77" pathLength="100" fill="none" strokeWidth="12" className={strokes[index % strokes.length]} strokeDasharray={`${fraction * 100} ${100 - fraction * 100}`} strokeDashoffset={-start} transform="rotate(-90 100 100)" />;
                })}
            </svg>
        </div>
        <div className="min-w-0">
            {categories.map((category, index) => <div className="flex min-h-11 items-center gap-3 border-b border-rule py-2 last:border-b-0" key={category.name}><span aria-hidden="true" className={`vic-dot h-3 w-3 ${fills[index % fills.length]}`} /><span className="min-w-0 flex-1 truncate text-base">{category.name}</span><strong className="vic-numeral shrink-0 whitespace-nowrap text-lg">{category.points.toLocaleString()} <small className="vic-label">pts</small></strong></div>)}
            {!total && <p className="text-base text-muted-foreground">No points earned in a category yet.</p>}
        </div>
    </div>;
}
