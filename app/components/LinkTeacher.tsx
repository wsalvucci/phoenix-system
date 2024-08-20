import Link from "next/link";
import { LinkedTeacher } from "../supaApi/mappers/dataTypes";

export default function LinkTeacher({ user }: { user: LinkedTeacher | null }) {

    return (
        <div className="my-5">
            {
                user !== null ? (
                    <Link href={`teacher`}>
                        <button
                            className="w-full py-2 px-3 flex justify-center text-2xl rounded-lg bg-blue-300 dark:bg-blue-700"
                        >
                            Teacher Portal
                        </button>
                    </Link>
                ) : (
                    <Link href="/linkAccount/teacher">
                        <button
                            className="w-full py-2 px-3 flex justify-center text-2xl rounded-lg bg-blue-300 dark:bg-blue-700"
                        >
                            Link Teacher
                        </button>
                    </Link>
                )
            }
        </div>
    )
}