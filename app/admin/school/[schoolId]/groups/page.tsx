"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { StudentGroup } from "@/app/dataClasses";
import addStudentGroup from "@/app/api/useCases/admin/studentGroup/addStudentGroup";
import { clientGetStudentGroups } from "@/app/supaApi/client/admin/studentGroups/adminStudentGroupsApi";

export default function GroupsDashboard({ params: { schoolId } }: { params: { schoolId: string } }) {

    const [loading, setLoading] = useState<boolean>(true);

    const [groups, setGroups] = useState<StudentGroup[]>([]);
    const [addGroupDialogOpen, setAddGroupDialogOpen] = useState<boolean>(false);
    const [groupNameTooShortError, setGroupNameTooShortError] = useState<boolean>(true);
    const [newGroupName, setNewGroupName] = useState<string>("");
    const [groupSearchText, setGroupSearchText] = useState<string>("");

    const [newGroupParent, setNewGroupParent] = useState<StudentGroup | null>(null);

    async function fetchGroups() {
        const groupData = await clientGetStudentGroups(parseInt(schoolId));
        setGroups(groupData ? groupData : []);
        setLoading(false);
    }

    useEffect(() => {
        fetchGroups();
    }, []);

    const submitNewGroupName = async (groupName: string) => {
        if (groupName.length > 3) {
            await addStudentGroup(parseInt(schoolId), groupName, undefined);
            await fetchGroups();
            setLoading(false);
        }
    }

    const addGroupDialog = () => {
        return (
            <div className="px-4 py-2 dark:bg-slate-700 border border-gray-300 rounded-md w-1/2 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div>
                    Add New Group {newGroupParent && `to ${newGroupParent.name}`}
                </div>
                <input
                    className="w-full p-3 my-1 dark:bg-slate-700 border border-gray-300 rounded-md"
                    type="text"
                    placeholder="Class Name"
                    onChange={(e) => {
                        if (e.target.value.length < 3) {
                            setGroupNameTooShortError(true);
                        } else {
                            setGroupNameTooShortError(false);
                            setNewGroupName(e.target.value);
                        }
                    }}
                />
                <button
                    className="w-1/2 p-3 my-1 rounded-lg bg-green-300 dark:bg-green-700 hover:bg-green-400 dark:hover:bg-green-600"
                    onClick={() => {
                        setLoading(true);
                        setAddGroupDialogOpen(false);
                        submitNewGroupName(newGroupName)
                    }}
                >
                    Confirm
                </button>
                <button
                    className="w-1/2 p-3 my-1 rounded-lg bg-red-300 dark:bg-red-700 hover:bg-red-400 dark:hover:bg-red-600"
                    onClick={() => setAddGroupDialogOpen(!addGroupDialogOpen)}
                >
                    Cancel
                </button>
                <div
                    className="w-full text-red-500"
                >
                    {groupNameTooShortError && "Group name must be at least 3 characters long"}
                </div>
            </div>
        )
    }

    function groupContainsText(groupData: StudentGroup, text: string): boolean {
        if (groupData.name.toLowerCase().includes(text.toLowerCase())) {
            return true;
        }
        if (groupData.childGroups !== null) {
            for (let i = 0; i < groupData.childGroups.length; i++) {
                if (groupContainsText(groupData.childGroups[i], text)) {
                    return true;
                }
            }
        }
        return false;
    }

    function groupEditButton(groupData: StudentGroup) {
        return (
            <Link href={`/admin/school/${schoolId}/editGroup/${groupData.id}`}>
                <button className="w-full rounded-lg bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600">
                    Edit
                </button>
            </Link>
        )
    }

    function levelToBorderColor(level: number): string {
        // Pastel colors
        const colors = ["#FFC0CB", "#FFD700", "#98FB98", "#87CEEB", "#FFA07A", "#DDA0DD", "#87CEFA", "#FF69B4", "#FF6347", "#F0E68C", "#FFA500", "#20B2AA", "#00FF7F", "#7B68EE", "#FF4500", "#9370DB", "#32CD32", "#40E0D0", "#FF1493", "#00BFFF", "#FFD700", "#FF69B4", "#FF6347", "#F0E68C", "#FFA500", "#20B2AA", "#00FF7F", "#7B68EE", "#FF4500", "#9370DB", "#32CD32", "#40E0D0", "#FF1493", "#00BFFF"];
        return colors[level % colors.length];
    }

    function groupTableRow(groupData: StudentGroup, level: number = 1) {
        return (
            <Link href={`/admin/school/${schoolId}/editGroup/${groupData.id}`} className={`col-span-3 grid grid-cols-3 hover:bg-slate-200 dark:hover:bg-slate-800 ${level === 1 ? "mt-3" : ""}`}>
                <div key={groupData.id} className={`text-lg border-l-8 `} style={{ paddingInlineStart: level * 20, borderColor: levelToBorderColor(level) }}>{groupData.name}</div>
                <div>{groupData.teachers?.length}</div>
                <div>{groupData.students?.length}</div>
            </Link>
        )
    }

    function recursiveGroupTableRow(groupData: StudentGroup, level: number = 1) {
        return (
            <Fragment>
                {groupTableRow(groupData, level)}
                {groupData.childGroups
                    ?.sort((a: StudentGroup, b: StudentGroup) => a.name.localeCompare(b.name))
                    ?.map((childGroup: StudentGroup) => recursiveGroupTableRow(childGroup, level + 1))}
            </Fragment>
        )
    }

    // Semi-transparent overlay to indicate loading
    const loadingOverlay = () => {
        return (
            <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-3xl text-white">Loading...</div>
            </div>
        )
    }


    return (
        <div className="animate-in h-full w-full">
            {loading && loadingOverlay()}
            <div className="h-1/6 p-3">
                <div className="flex justify-between items-center">
                    <button
                        className="p-3 rounded-lg bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
                        onClick={() => {
                            setNewGroupParent(null)
                            setAddGroupDialogOpen(!addGroupDialogOpen)
                        }}
                    >
                        Add Group
                    </button>
                </div>
                <input
                    className="w-1/4 p-3 my-1 dark:bg-slate-700 border border-gray-300 rounded-md"
                    type="text"
                    placeholder="Search Groups"
                    onChange={(e) => setGroupSearchText(e.target.value)}
                />
            </div>
            <div className="h-5/6 overflow-y-scroll">
                <div className="m-5">
                    <div className="w-full grid grid-cols-3">
                        <div className="text-2xl border-b">Group Name</div>
                        <div className="text-2xl border-b"># Teachers</div>
                        <div className="text-2xl border-b"># Students</div>
                        {
                            groups
                                .filter((groupData: StudentGroup) => groupSearchText === "" || groupContainsText(groupData, groupSearchText))
                                .sort((a: StudentGroup, b: StudentGroup) => a.name.localeCompare(b.name))
                                .map((groupData: StudentGroup) => recursiveGroupTableRow(groupData))
                        }
                    </div>
                </div>
            </div>
            {addGroupDialogOpen && addGroupDialog()}
        </div>
    )
}