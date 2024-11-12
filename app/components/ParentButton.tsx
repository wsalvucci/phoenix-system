import Link from "next/link";

export default function ParentButton() {

    return (
        <div className="my-5">
            <Link href={`parent`}>
                <button
                    className="w-full py-2 px-3 flex justify-center text-2xl rounded-lg bg-blue-300 dark:bg-blue-700"
                >
                    Parents
                </button>
            </Link>
        </div>
    )
}