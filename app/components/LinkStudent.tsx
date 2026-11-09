import Link from "next/link";
import { Student } from "../dataClasses";

export default function LinkStudent({ user }: { user: Student | null }) {

    return (
        <div className="my-5">
            {
                user !== null ? (
                    <Link href={`student`}>
                        <button
                            className="w-full py-2 px-3 flex justify-center text-2xl rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            Student Portal
                        </button>
                    </Link>
                ) : (
                    <Link href="/linkAccount/student">
                        <button
                            className="w-full py-2 px-3 flex justify-center text-2xl rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            Link Student
                        </button>
                    </Link>
                )
            }
        </div>
    )
}