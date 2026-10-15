import { redirect } from "next/navigation";
import { getDisplayContext } from "@/app/supaApi/server/display/displayAccess";
import { KioskPairing } from "./KioskPairing";

// The kiosk entry point. No staff login: a paired screen goes straight to its displays; an unpaired
// one shows a pairing code that a staff member approves from their own signed-in device (D17).
export const dynamic = "force-dynamic";

export default async function DisplayPage() {
    if ((await getDisplayContext()) !== null) redirect("/dashboard/featured");
    return <KioskPairing />;
}
