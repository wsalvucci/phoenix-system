import Link from "next/link";
import { Admin } from "../dataClasses";

export default function AdminPortal({ user }: { user: Admin }) {
    return (
        <div className="my-5">
            <Link href={`admin`}>
                <button
                    className="w-full py-2 px-3 flex justify-center text-2xl rounded-lg bg-blue-300 dark:bg-blue-700"
                >
                    Admin Portal
                </button>
            </Link>
        </div>
    )
}