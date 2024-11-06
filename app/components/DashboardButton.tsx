import Link from "next/link";

export default function DashbaordButton() {

    return (
        <div className="my-5">
            <Link href={`dashboard`}>
                <button
                    className="w-full py-2 px-3 flex justify-center text-2xl rounded-lg bg-blue-300 dark:bg-blue-700"
                >
                    Dashboards
                </button>
            </Link>
        </div>
    )
}