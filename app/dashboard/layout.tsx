import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCallerAccess } from "@/app/supaApi/server/staffAccess";

// Every route under /dashboard requires an authenticated staff (teacher/admin) user.
// This gate is for navigation only; the server actions behind these pages enforce
// the same rule independently (see staffAccess.ts) because they are directly POST-able.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const access = await getCallerAccess();
    if (access === null || access.staffSchoolIds.length === 0) redirect("/");

    return <>{children}</>;
}
