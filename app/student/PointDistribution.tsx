const colors = ["#74deec", "#308ee0", "#a3baff", "#54b4aa", "#cec6fa"];

export default function PointDistribution({ categories }: { categories: { name: string; points: number }[] }) {
    const total = categories.reduce((sum, category) => sum + Math.max(0, category.points), 0);
    let offset = 0;
    return <div className="student-distribution">
        <div className="student-orbit">
            <svg viewBox="0 0 200 200" role="img" aria-label="Distribution of positive points by category. Values are listed alongside.">
                <circle cx="100" cy="100" r="94" fill="none" stroke="#25526a" strokeDasharray="2 6" />
                <circle cx="100" cy="100" r="77" fill="none" stroke="#173545" strokeWidth="12" />
                {categories.map((category, index) => {
                    const fraction = total ? Math.max(0, category.points) / total : 0;
                    const start = offset; offset += fraction * 100;
                    return <circle key={category.name} cx="100" cy="100" r="77" pathLength="100" fill="none" stroke={colors[index % colors.length]} strokeWidth="12" strokeDasharray={`${fraction * 100} ${100 - fraction * 100}`} strokeDashoffset={-start} transform="rotate(-90 100 100)" />;
                })}
                <text x="100" y="99" textAnchor="middle" fill="#e6f8ff" fontSize="27" fontWeight="700">{total.toLocaleString()}</text>
                <text x="100" y="120" textAnchor="middle" fill="#91b5c9" fontSize="9" letterSpacing="2">POSITIVE POINTS</text>
            </svg>
        </div>
        <div className="student-distribution-legend"><p className="student-kicker">Point composition</p><h3>Every category counts.</h3>{categories.map((category, index) => <div className="student-category-line" key={category.name}><span className="student-category-dot" style={{ background: colors[index % colors.length] }} /><span>{category.name}</span><strong>{category.points.toLocaleString()} <small>PTS</small></strong></div>)}{!total && <p>No positive points recorded for this timeframe.</p>}</div>
    </div>;
}
