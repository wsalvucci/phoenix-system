"use client";
import { OverallWall } from "@/components/display/OverallWall";

/** The podium wall: the overall top students. Portrait panels stack the podium plates over the
 *  ledger; landscape uses the same two-column scene as the Hall of Honor. */
export default function TopCards() {
  return <OverallWall queryName="topCards" />;
}
