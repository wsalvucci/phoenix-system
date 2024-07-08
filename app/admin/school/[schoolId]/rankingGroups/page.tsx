"use client";
import { createClient } from "@/utils/supabase/client"
import { RankingGroup, StudentGroup } from "@/app/dataClasses";
import { useEffect, useState } from "react";
import { clientAddSchoolRankingGroup, clientAddStudentGroupToRankingGroup, clientGetSchoolRankingGroups, clientRemoveStudentGroupFromRankingGroup } from "@/app/supaApi/client/admin/rankingGroups/adminRankingGroupsApi";
import { clientGetStudentGroups } from "@/app/supaApi/client/admin/studentGroups/adminStudentGroupsApi";

export default function RankingGroupsDashboard({ params: { schoolId } }: { params: { schoolId: string } }) {

    const supabase = createClient();

    const [rankingGroups, setRankingGroups] = useState<RankingGroup[]>([]);
    const [addRankingGroupDialogOpen, setAddRankingGroupDialogOpen] = useState<boolean>(false);
    const [newRankingGroupName, setNewRankingGroupName] = useState<string>("");
    const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([]);
    const [addStudentGroupToRankingGroupDialogOpen, setAddStudentGroupToRankingGroupDialogOpen] = useState<boolean>(false);
    const [selectedRankingGroup, setSelectedRankingGroup] = useState<RankingGroup | null>(null);
    const [selectedRankingGroupStudentGroups, setSelectedRankingGroupStudentGroups] = useState<StudentGroup[]>([]);

    const fetchData = async () => {
        setRankingGroups(await clientGetSchoolRankingGroups(parseInt(schoolId)) ?? []);
        setStudentGroups(await clientGetStudentGroups(parseInt(schoolId)) ?? []);
    }

    const rankingGroupCard = (rankingGroup: RankingGroup) => {
        return (
            <div className="bg-slate-300 dark:bg-slate-700 shadow-md rounded p-3 mb-4">
                <div className="flex items-center justify-center text-3xl font-bold">{rankingGroup.name}</div>
                <div className="flex items-center justify-center">
                    <button
                        className="border hover:bg-green-300 dark:hover:bg-green-700 rounded p-2"
                        onClick={() => {
                            setSelectedRankingGroup(rankingGroup);
                            setSelectedRankingGroupStudentGroups(rankingGroup.groups);
                            setAddStudentGroupToRankingGroupDialogOpen(true);
                        }}
                    >Add Student Group</button>
                </div>
                <div className="grid grid-cols-4 gap-5 py-3">
                    {rankingGroup.groups
                        .sort((a, b) => { return a.name.localeCompare(b.name) })
                        .map((group) => {
                            return (
                                <div>
                                    <div className="bg-slate-400 dark:bg-slate-600 shadow-md rounded-t p-3">
                                        <div className="flex items-center justify-center text-xl font-bold">{group.name}</div>
                                    </div>
                                    <div className="flex items-center justify-center border rounded-b hover:bg-red-300 dark:hover:bg-red-700 ">
                                        <button
                                            onClick={() => removeStudentGroupFromRankingGroup(group.id, rankingGroup.id)}
                                        >Remove</button>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>
        )
    }

    const addRankingGroup = async () => {
        await clientAddSchoolRankingGroup(parseInt(schoolId), newRankingGroupName);

        fetchData();
    }

    const addStudentGroupToRankingGroup = async (groupId: number, rankingGroupId: number | undefined) => {
        if (rankingGroupId === undefined) {
            console.error("No ranking group selected");
            return;
        }

        await clientAddStudentGroupToRankingGroup(groupId, rankingGroupId);

        fetchData();
    }

    const removeStudentGroupFromRankingGroup = async (groupId: number, rankingGroupId: number | undefined) => {
        if (rankingGroupId === undefined) {
            console.error("No ranking group selected");
            return;
        }

        console.log(groupId, rankingGroupId);
        await clientRemoveStudentGroupFromRankingGroup(groupId, rankingGroupId);

        fetchData();
    }

    const addRankingGroupDialog = () => {
        return (
            <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-slate-300 dark:bg-slate-700 shadow-md rounded p-3 mb-4">
                    <div className="flex items-center justify-center text-3xl font-bold">Add Ranking Group</div>
                    <div className="grid grid-cols-1">
                        <input
                            className="shadow-md rounded p-3 mb-4 dark:[color-scheme:dark]"
                            placeholder="Name"
                            onChange={(e) => setNewRankingGroupName(e.target.value)}
                        />
                        <button
                            className="border hover:bg-green-300 dark:hover:bg-green-700 shadow-md rounded p-3 mb-4 dark:[color-scheme:dark]"
                            onClick={() => {
                                setAddRankingGroupDialogOpen(false);
                                addRankingGroup();
                            }}
                        >Add</button>
                    </div>
                </div>
            </div>
        )
    }

    const recursiveAddStudenGroupButton = (group: StudentGroup, level: number) => {
        level++
        return (
            <div className="grid grid-cols-1 gap-1">
                <div className="flex items-center justify-between border-b p-1 hover:bg-slate-200 dark:hover:bg-slate-800">
                    <div className="flex items-center gap-2">
                        <div className="pl-3" style={{ paddingLeft: `${level * 10}px` }}>{group.name}</div>
                    </div>
                    <button
                        className="px-1 border w-fit hover:bg-green-300 dark:hover:bg-green-700 rounded"
                        onClick={() => {
                            addStudentGroupToRankingGroup(group.id, selectedRankingGroup?.id);
                            setAddStudentGroupToRankingGroupDialogOpen(false);
                        }}
                    >Add</button>
                </div>
                {group.childGroups
                    ?.filter((group) => {
                        return selectedRankingGroupStudentGroups.find((rankingGroup) => rankingGroup.id === group.id) === undefined;
                    })
                    .map((childGroup) => {
                        return recursiveAddStudenGroupButton(childGroup, level);
                    })}
            </div>
        )
    }

    const addStudenGroupToRankingGroupDialog = () => {
        return (
            <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-slate-300 dark:bg-slate-700 shadow-md rounded p-3 mb-4">
                    <div className="flex items-center justify-center text-3xl font-bold">Add Student Group to {selectedRankingGroup?.name}</div>
                    <div className="grid grid-cols-1 gap-1 max-h-96 overflow-y-scroll">
                        {
                            studentGroups
                                .filter((group) => {
                                    return selectedRankingGroupStudentGroups.find((rankingGroup) => rankingGroup.id === group.id) === undefined;
                                })
                                .map((group) => {
                                    return recursiveAddStudenGroupButton(group, 0);
                                })
                        }
                    </div>
                    <button
                        className="w-full mt-1 border hover:bg-green-300 dark:hover:bg-green-700 shadow-md rounded p-3 mb-4 dark:[color-scheme:dark]"
                        onClick={() => setAddStudentGroupToRankingGroupDialogOpen(false)}
                    >Close</button>
                </div>
            </div>
        )
    }

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="animate-in w-full h-full p-3">
            {addRankingGroupDialogOpen && addRankingGroupDialog()}
            {addStudentGroupToRankingGroupDialogOpen && addStudenGroupToRankingGroupDialog()}
            <div className="text-xl">Ranking Groups</div>
            <button
                className="border hover:bg-green-300 dark:hover:bg-green-700 rounded-lg p-2"
                onClick={() => setAddRankingGroupDialogOpen(true)}
            >Add Ranking Group</button>
            <div className="pt-3">
                {
                    rankingGroups
                        .sort((a, b) => { return a.name.localeCompare(b.name) })
                        .map((rankingGroup) => {
                            return rankingGroupCard(rankingGroup);
                        })
                }
            </div>
        </div>
    )
}