"use client";
import { OverallWall } from "@/components/display/OverallWall";

/** The Hall of Honor: the overall top ten, one fixed scene for a lobby. It never rotates. */
export default function GlobalDashboard() {
  return <OverallWall queryName="global-display" />;
}
