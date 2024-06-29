"use client";

import { createClient } from "@/utils/supabase/client"
import { useEffect, useState } from "react";
import { createGroup } from "../actions";
import Link from "next/link";
import { GroupData } from "../dataClasses";

export default function GroupsDashboard({ params: { schoolId } }: { params: { schoolId: string } }) {

    const supabase = createClient();

    const [loading, setLoading] = useState<boolean>(true);

    const [groups, setGroups] = useState<GroupData[]>([]);
    const [addGroupDialogOpen, setAddGroupDialogOpen] = useState<boolean>(false);
    const [groupNameTooShortError, setGroupNameTooShortError] = useState<boolean>(true);
    const [newGroupName, setNewGroupName] = useState<string>("");
    const [groupSearchText, setGroupSearchText] = useState<string>("");

    const [newGroupParent, setNewGroupParent] = useState<GroupData | null>(null);

    const getGroup = async (groupId: number): Promise<GroupData | null> => {
        const { data: groupData, error } = await supabase.from("student_group").select("*, child_groups:student_group (id), school (*)").eq("id", groupId);
        if (error) {
            console.error("Error fetching class", error);
            return null;
        } else if (groupData === null || groupData.length === 0) {
            console.log("No class found for id: " + groupId);
            return null;
        } else {
            const firstGroup = groupData[0];
            var childGroups: GroupData[] = [];
            await Promise.all(firstGroup.child_groups.map(async (childGroup: any) => {
                const newGroupData = await getGroup(childGroup.id);
                if (newGroupData !== null) {
                    childGroups.push(newGroupData);
                }
            }))
            const newGroup = new GroupData(
                firstGroup.id,
                firstGroup.name,
                firstGroup.parent_id,
                childGroups,
                null,
                null
            );
            return newGroup;
        }
    }

    const fetchGroups = async () => {
        const { data: groupData, error } = await supabase.from("student_group").select("id").eq("school_id", schoolId).is("parent_id", null);
        if (error) {
            console.error("Error fetching classes", error);
        } else if (groupData === null || groupData.length === 0) {
            console.log("No classes found for school: " + schoolId);
        } else {
            var newGroups: GroupData[] = [];
            await Promise.all(groupData.map(async (group: any) => {
                const newGroupData = await getGroup(group.id);
                if (newGroupData !== null) {
                    newGroups.push(newGroupData);
                }
            }))
            console.log("New Groups: ", newGroups);
            setGroups(newGroups);
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchGroups();
    }, []);

    const submitNewGroupName = async (groupName: string, parentGroupId: number | null) => {
        if (groupName.length > 3) {
            await createGroup(parseInt(schoolId), groupName, parentGroupId);
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
                        submitNewGroupName(newGroupName, newGroupParent?.id || null)
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

    const groupCard = (groupData: GroupData) => {
        return (
            <div
                key={groupData.id}
                className={`w-fit py-1 my-3 px-5 rounded-lg border ${(groupData.name.toLowerCase().includes(groupSearchText.toLowerCase()) && groupSearchText !== "") ? "bg-slate-400 dark:bg-slate-600" : "bg-slate-300 dark:bg-slate-700"} `}
            >
                <Link href={`/admin/school/${schoolId}/editGroup/${groupData.id}`}>
                    <div className="flex justify-between items-center gap-1">
                        <div className="flex items-center gap-2">
                            <div className="text-lg font-bold">{groupData.name}</div>
                        </div>
                    </div>
                    {
                        groupData.childGroups?.length !== 0 &&
                        <div className="h-1 bg-slate-400 dark:bg-slate-600 my-2" />
                    }
                    <div className="flex gap-1">
                        {
                            groupData.childGroups
                                ?.sort((a: GroupData, b: GroupData) => a.name.localeCompare(b.name))
                                .map((childGroup: GroupData) => groupCard(childGroup))
                        }
                    </div>
                </Link>
            </div>
        )
    }

    function groupContainsText(groupData: GroupData, text: string): boolean {
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
                    {
                        groups
                            .filter((groupData: GroupData) => groupSearchText === "" || groupContainsText(groupData, groupSearchText))
                            .sort((a: GroupData, b: GroupData) => a.name.localeCompare(b.name))
                            .map((groupData: GroupData) => groupCard(groupData))
                    }
                </div>
            </div>
            {addGroupDialogOpen && addGroupDialog()}
        </div>
    )
}