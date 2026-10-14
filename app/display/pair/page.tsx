import { PairDisplay } from "./PairDisplay";

export const dynamic = "force-dynamic";

export default function PairDisplayPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
    const raw = searchParams?.school;
    const requested = typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : null;
    return <PairDisplay requested={requested} />;
}
