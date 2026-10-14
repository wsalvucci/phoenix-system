import { redirect } from "next/navigation";

// Legacy alias kept so existing bookmarks/kiosk URLs keep working.
export default function FeatureAlias() {
  redirect("/dashboard/featured");
}
