"use client";

import { School } from "@/app/dataClasses";

export default function SchoolSelectComponent({ startingId, schools }: { startingId: number, schools: School[] }) {
    {/* Dropdown menu that, on click, navigates the user to /admin/school/[schoolId] */ }
    return (
        <div className="p-5 dark:[color-scheme:dark]">
            <select onChange={
                (e) => {
                    window.location.href = `/admin/school/${e.target.value}`;
                }
            }
                defaultValue={
                    startingId
                }>
                {schools.map((school) => {
                    return (
                        <option
                            key={school.id}
                            value={school.id}
                        >
                            {school.name}
                        </option>
                    )
                })}
            </select>
        </div>
    )
}