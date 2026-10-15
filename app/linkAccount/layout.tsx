import { redirect } from "next/navigation";
import getOwnUserData from "../supaApi/server/getOwnUserData"

export default async function LinkAccountLayout({ children }: { children: React.ReactNode }) {

    const userData = await getOwnUserData();

    if (userData === null) {
        redirect("/login")
    }

    return (
        <div className="app-page flex flex-1 flex-col px-4 py-8">
            {children}
        </div>
    )
}
