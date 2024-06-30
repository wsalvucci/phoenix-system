"use client";
import { createClient } from "@/utils/supabase/client"
import { Group, GroupData } from "../dataClasses";
import { useEffect, useState } from "react";

class RankingGroup {
    id: number;
    name: string;
    groups: GroupData[];

    constructor(
        id: number,
        name: string,
        groups: GroupData[]
    ) {
        this.id = id;
        this.name = name;
        this.groups = groups;
    }
}

export default function RankingGroupsDashboard({ params: { schoolId } }: { params: { schoolId: string } }) {

    const supabase = createClient();

    const [rankingGroups, setRankingGroups] = useState<RankingGroup[]>([]);
    const [addRankingGroupDialogOpen, setAddRankingGroupDialogOpen] = useState<boolean>(false);
    const [newRankingGroupName, setNewRankingGroupName] = useState<string>("");
    const [studentGroups, setStudentGroups] = useState<GroupData[]>([]);
    const [addStudentGroupToRankingGroupDialogOpen, setAddStudentGroupToRankingGroupDialogOpen] = useState<boolean>(false);
    const [selectedRankingGroup, setSelectedRankingGroup] = useState<RankingGroup | null>(null);
    const [selectedRankingGroupStudentGroups, setSelectedRankingGroupStudentGroups] = useState<GroupData[]>([]);

    const getGroup = async (groupId: number): Promise<GroupData | null> => {
        const { data: groupData, error } = await supabase.from("student_group").select("*, child_groups:student_group (id)").eq("id", groupId);
        if (error) {
            console.error("Error fetching groups", error);
            return null;
        } else if (groupData === null || groupData.length === 0) {
            console.log("No groups found for id: " + groupId);
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
            setStudentGroups(newGroups);
        }
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
        const { data, error } = await supabase
            .from('ranking_group')
            .insert([
                {
                    school_id: schoolId,
                    name: newRankingGroupName
                }
            ]);

        if (error) {
            console.error(error);
            return;
        }

        fetchRankingGroups();
    }

    const addStudentGroupToRankingGroup = async (groupId: number, rankingGroupId: number | undefined) => {
        if (rankingGroupId === undefined) {
            console.error("No ranking group selected");
            return;
        }
        const { data, error } = await supabase
            .from('ranking_group_pair')
            .insert([
                {
                    ranking_group_id: rankingGroupId,
                    student_group_id: groupId
                }
            ]);

        if (error) {
            console.error(error);
            return;
        }

        fetchRankingGroups();
    }

    const removeStudentGroupFromRankingGroup = async (groupId: number, rankingGroupId: number | undefined) => {
        if (rankingGroupId === undefined) {
            console.error("No ranking group selected");
            return;
        }
        const { data, error } = await supabase
            .from('ranking_group_pair')
            .delete()
            .eq('ranking_group_id', rankingGroupId)
            .eq('student_group_id', groupId);

        if (error) {
            console.error(error);
            return;
        }

        fetchRankingGroups();
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

    const recursiveAddStudenGroupButton = (group: GroupData, level: number) => {
        level++
        return (
            <div className="grid grid-cols-1 gap-1">
                <div className="flex items-center justify-between border-b p-1">
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
                    <div className="grid grid-cols-1 gap-1">
                        {
                            studentGroups
                                .filter((group) => {
                                    return selectedRankingGroupStudentGroups.find((rankingGroup) => rankingGroup.id === group.id) === undefined;
                                })
                                .map((group) => {
                                    return recursiveAddStudenGroupButton(group, 0);
                                })
                        }
                        <button
                            className="border hover:bg-green-300 dark:hover:bg-green-700 shadow-md rounded p-3 mb-4 dark:[color-scheme:dark]"
                            onClick={() => setAddStudentGroupToRankingGroupDialogOpen(false)}
                        >Close</button>
                    </div>
                </div>
            </div>
        )
    }

    const fetchRankingGroups = async () => {
        const { data, error } = await supabase
            .from('ranking_group')
            .select('*, student_groups:student_group(*)')
            .eq('school_id', schoolId);

        if (error) {
            console.error(error);
            return [];
        }

        const mappedRankingGroupData = await Promise.all(data.map((rankingGroup: any) => {
            return new RankingGroup(
                rankingGroup.id,
                rankingGroup.name,
                rankingGroup.student_groups.map((group: any) => {
                    return new GroupData(
                        group.id,
                        group.name,
                        group.parent_id,
                        null,
                        null,
                        null
                    );
                })
            );
        }));

        setRankingGroups(mappedRankingGroupData);
    }

    useEffect(() => {
        fetchRankingGroups();
        fetchGroups();
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