import type { ReactNode } from "react";
import { honorFont } from "@/components/display/fonts";

export default function DisplayLayout({ children }: { children: ReactNode }) {
  return <div className={`${honorFont.variable} w-full`}>{children}</div>;
}
