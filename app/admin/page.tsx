"use client";
import { AdminHomeDashboard, School } from "@/types/domain";
import { getAdminHomeDashboard } from "@/api/admin";
import { LoadingState } from "@/components/LoadingLayout";
import { useQuery } from "@tanstack/react-query";
import { wrapServerAction } from "@/utils/serverActionWrapper";
import MotionButton from "@/components/MotionButton";

export default function AdminHome() {
    const {data, isLoading, error }= useQuery({
        queryKey: ["adminDashboard"],
        queryFn: () => wrapServerAction(getAdminHomeDashboard)()
    })

    console.log("AdminHome debug:", { data, isLoading, error });

    const schoolCard = (school: School) => {
        return (
            <MotionButton 
                href={`/admin/school/${school.id}`} 
                key={school.id}
                variant="secondary"
                className="bg-slate-500 shadow-md"
            >
                <div className="flex items-center justify-center text-3xl font-bold w-full">
                    {school.name}
                </div>
            </MotionButton>
        )
    }

    return (
        <LoadingState
            isLoading={isLoading}
            error={error}
            data={data}
            errorFallback={(err) => <div>Error: {err.message}</div>}>
        {(data) => <div className="w-full h-full">
            <header className="flex items-center justify-center w-full p-5 bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                <div>
                    <div>
                        <div>
                            <h1 className="text-3xl font-bold">Welcome to the admin dashboard</h1>
                        </div>
                    </div>
                </div>
            </header>
            <div className="m-5">
                <div>
                    <div>
                        <h1 className="text-3xl font-bold">Your Schools</h1>
                        <div className="grid grid-cols-4 gap-5">
                            {data?.schools.map((school) => {
                                return (
                                    schoolCard(school)
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div> }
        </LoadingState>
    );
}