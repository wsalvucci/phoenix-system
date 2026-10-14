import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getDashboardViewer, hasDisplayCookie } from "@/app/supaApi/server/display/displayAccess";
import { safeNextPath } from "@/lib/safeRedirect";

// Every route under /dashboard requires a dashboard viewer: a live paired display device (for its
// one school), or an authenticated staff (teacher/admin) user. getDashboardViewer() is the only
// viewer source here (DATA_DISCLOSURE.md §11.4 #23). This gate is for navigation only; the server
// actions behind these pages resolve the viewer again because they are directly POST-able.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const viewer = await getDashboardViewer();
    if (viewer !== null) return <>{children}</>;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        // A screen that was a display (revoked, or its pairer left) goes back to the pairing code,
        // never to a keyboard login on the TV.
        if (hasDisplayCookie()) redirect("/display");
        // Return to the requested screen after sign-in (same-origin paths only).
        const next = safeNextPath(headers().get("x-next-path"), "/dashboard");
        redirect(`/login?next=${encodeURIComponent(next)}`);
    }
    redirect("/");
}
