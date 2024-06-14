import { createClient } from "@/utils/supabase/client"

export default function StudentGroupsDashboard({ schoolId, adminId }: { schoolId: number, adminId: number }) {

    const supabase = createClient();

    return (
        <div>
            <h1>Student Groups Dashboard</h1>
        </div>
    )
}