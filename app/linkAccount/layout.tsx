import { redirect } from "next/navigation";
import getOwnUserData from "../supaApi/server/getOwnUserData"

export default async function LinkAccountLayout({ children }: { children: React.ReactNode }) {

    const userData = await getOwnUserData();

    if (userData === null) {
        redirect("/login")
    }

    return (
        <div className="grid grid-cols-1">
            <div className="flex justify-center">Link Your Account</div>
            {children}
        </div>
    )
}