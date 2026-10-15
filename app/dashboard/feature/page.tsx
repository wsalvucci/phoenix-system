import { redirect } from "next/navigation";

// Legacy alias kept so existing bookmarks/kiosk URLs keep working.
// Keeps the query string so a bookmarked ?school= survives.
export default function FeatureAlias({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value)) value.forEach((v) => qs.append(key, v));
  }
  const query = qs.toString();
  redirect(`/dashboard/featured${query ? `?${query}` : ""}`);
}
