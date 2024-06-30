import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

export default function TeacherHome() {

    const supabase = createClient();

    const getGroups = async () => {
        const { data: groups, error } = await supabase
            .from("student_group, teacher (*)")
            .select("*")

    }

    return (
        <div></div>
    )
}