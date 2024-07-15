import Link from "next/link"

export default async function TeacherGroupLayout({ children, params: { groupId } }: { children: React.ReactNode, params: { groupId: string } }) {

    const sideBarButton = (text: string, href: string) => {
        return (
            <Link href={`/teacher/group/${groupId}/${href}`}>
                <button
                    className="w-full p-3 my-1 flex items-center justify-center rounded-lg bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
                >
                    {text}
                </button>
            </Link>
        )
    }


    return (
        <div className="h-dvh w-full flex flex-col text-slate-700 dark:text-slate-300">
            <header className="h-20 p-5 flex items-center justify-between w-screen bg-slate-300 dark:bg-slate-700">
                <h1 className="text-3xl font-bold">Group Dashboard</h1>
            </header>
            <div className="h-full overflow-hidden flex flex-grow bg-slate-100 dark:bg-slate-900">
                <div className="h-full py-5 px-2 w-1/6 bg-slate-200 dark:bg-slate-800">
                    {sideBarButton("Home", "")}
                    <div className="h-1 bg-slate-300 dark:bg-slate-700 my-2" />
                    {sideBarButton("Configuration", "configuration")}
                    {sideBarButton("Scorebook", "scorebook")}
                </div>
                <div className="w-full h-full overflow-auto">
                    {/* Children with schoolId and adminId props */}
                    {children}
                </div>
            </div>
        </div>
    )
}