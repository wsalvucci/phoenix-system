import Link from "next/link";
import { Student } from "../dataClasses";

export default function LinkStudent({ user }: { user: Student | null }) {

    return (
        <div className="my-5">
            {
                user !== null ? (
                    <Link href={`student`}>
                        <button
                            className="w-full py-2 px-3 flex justify-center text-2xl rounded-lg bg-blue-300 dark:bg-blue-700"
                        >
                            Student Portal
                        </button>
                    </Link>
                ) : (
                    <Link href="/linkAccount/student">
                        <button
                            className="w-full py-2 px-3 flex justify-center text-2xl rounded-lg bg-blue-300 dark:bg-blue-700"
                        >
                            Link Student
                        </button>
                    </Link>
                )
            }
        </div>
    )
}