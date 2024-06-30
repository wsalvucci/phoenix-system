"use client";
import { createClient } from "@/utils/supabase/client"
import { PointGroup } from "../dataClasses";
import { useEffect, useState } from "react";

export default function PointGroups({ params: { schoolId } }: { params: { schoolId: string } }) {

    const supabase = createClient();

    const [pointGroups, setPointGroups] = useState<PointGroup[]>([]);
    const [tempPointGroups, setTempPointGroups] = useState<PointGroup[]>([]);

    const getGroupData = async (pointGroupId: number): Promise<PointGroup | null> => {
        const { data: pointGroupData, error } = await supabase.from("point_group").select("*, child_groups:point_group (id)").eq("id", pointGroupId);
        if (error) {
            console.error("Error fetching point group", error);
            return null;
        } else if (pointGroupData === null || pointGroupData.length === 0) {
            console.log("No point group found for id: " + pointGroupId);
            return null;
        } else {
            const firstPointGroup = pointGroupData[0];
            var childGroups: PointGroup[] = [];
            await Promise.all(firstPointGroup.child_groups.map(async (childGroup: any) => {
                const newPointGroup = await getGroupData(childGroup.id);
                if (newPointGroup !== null) {
                    childGroups.push(newPointGroup);
                }
            }))
            const newPointGroup = new PointGroup(
                firstPointGroup.id,
                firstPointGroup.name,
                firstPointGroup.parent_id,
                childGroups,
                firstPointGroup.ranked,
                firstPointGroup.color
            );
            return newPointGroup;
        }
    }

    const fetchPointGroups = async () => {
        const { data: pointGroupData, error } = await supabase.from("point_group").select("id").eq("school_id", schoolId).is("parent_id", null);
        if (error) {
            console.error("Error fetching point groups", error);
        } else if (pointGroupData === null || pointGroupData.length === 0) {
            console.log("No point groups found for school: " + schoolId);
        } else {
            console.log("Point groups found for school: " + schoolId);
            var fetchedParentGroups: PointGroup[] = [];
            await Promise.all(pointGroupData.map(async (pointGroup: any) => {
                const newPointGroup = await getGroupData(pointGroup.id);
                if (newPointGroup !== null) {
                    fetchedParentGroups.push(newPointGroup);
                }
            }))
            setPointGroups(fetchedParentGroups);
            setTempPointGroups(fetchedParentGroups);
        }
    }

    useEffect(() => {
        fetchPointGroups();
    }, []);

    const recursivelySavePointGroup = async (pointGroup: PointGroup) => {
        const { data, error } = await supabase.from("point_group").update({
            name: pointGroup.name,
            ranked: pointGroup.ranked,
            color: pointGroup.color
        }).eq("id", pointGroup.id);
        if (error) {
            console.error("Error updating point group", error);
        } else {
            console.log("Point group updated");
        }
        if (pointGroup.childGroups !== null) {
            await Promise.all(pointGroup.childGroups.map(async (childGroup) => {
                await recursivelySavePointGroup(childGroup);
            })
            )
        }
    }

    const saveChanges = async () => {
        const pointGroupChanges = tempPointGroups.filter((tempGroup) => currentlyDiff(tempGroup));
        await Promise.all(pointGroupChanges.map(async (pointGroup) => {
            await recursivelySavePointGroup(pointGroup);
        }))
        setPointGroups(tempPointGroups);
    }

    const resetChanges = () => {
        setTempPointGroups(pointGroups);
    }

    const anyDiff = (): boolean => {
        // Recursively find any point group that is different from the original
        const recursiveDiff = (pointGroup: PointGroup): boolean => {
            if (currentlyDiff(pointGroup)) {
                return true;
            } else if (pointGroup.childGroups !== null) {
                return pointGroup.childGroups.some((childGroup) => recursiveDiff(childGroup));
            } else {
                return false;
            }
        }
        for (const pointGroup of tempPointGroups) {
            if (recursiveDiff(pointGroup)) {
                return true;
            }
        }
        return false;
    }

    const currentlyDiff = (pointGroup: PointGroup): boolean => {
        // Recursively find the point group using recursiveFindPointGroup
        const currentGroup = recursivelyFindPointGroup(pointGroup.id);
        if (currentGroup === undefined) {
            return false;
        } else {
            return pointGroup.name !== currentGroup?.name || pointGroup.ranked !== currentGroup?.ranked || pointGroup.color !== currentGroup?.color;
        }
    }

    const recursivelyFindPointGroup = (id: number): PointGroup | null => {
        const recursiveFind = (pointGroup: PointGroup): PointGroup | null => {
            if (pointGroup.id === id) {
                return pointGroup;
            } else if (pointGroup.childGroups !== null) {
                for (const childGroup of pointGroup.childGroups) {
                    const foundGroup = recursiveFind(childGroup);
                    if (foundGroup !== null) {
                        return foundGroup;
                    }
                }
                return null;
            } else {
                return null;
            }
        }
        for (const pointGroup of pointGroups) {
            var foundGroup = recursiveFind(pointGroup);
            if (foundGroup !== null) {
                return foundGroup;
            }
        }
        return null;
    }

    const updateTempPointGroupState = (newPointGroup: PointGroup) => {
        // Recursively search through tempPointGroups to find the point group with the given id and update it
        const recursiveUpdate = (pointGroup: PointGroup): PointGroup => {
            if (pointGroup.id === newPointGroup.id) {
                return newPointGroup;
            } else if (pointGroup.childGroups !== null) {
                return {
                    ...pointGroup,
                    childGroups: pointGroup.childGroups.map((childGroup) => recursiveUpdate(childGroup))
                }
            } else {
                return pointGroup;
            }
        }
        setTempPointGroups(tempPointGroups.map((pointGroup) => recursiveUpdate(pointGroup)));
    }

    const recursivePointGroupCard = (pointGroup: PointGroup, level: number) => {
        return (
            <div
                key={pointGroup.id}
                className={`rounded-lg bg-slate-300 dark:bg-slate-700`}>
                {
                    level > 0 && <div className="col-span-3 h-1 bg-slate-400 dark:bg-slate-600" style={{ marginInlineStart: level * 15 }}></div>
                }
                <div className={`rounded-lg my-1 py-1 grid grid-cols-3 ${currentlyDiff(pointGroup) ? "bg-orange-200 dark:bg-orange-800" : "bg-slate-300 dark:bg-slate-700"}`}>
                    <div style={{ marginInlineStart: level * 15 }}>
                        <input
                            className="w-full h-fit p-1 rounded-t-lg text-lg dark:[color-scheme:dark]"
                            type="text"
                            value={pointGroup.name}
                            // Make use of findPointGroup to update the correct point group
                            onChange={(e) => {
                                updateTempPointGroupState({
                                    ...pointGroup,
                                    name: e.target.value
                                });
                            }}
                        />
                        <button
                            className="border rounded-b-lg px-2 py-1 hover:bg-green-300 dark:hover:bg-green-700"
                            onClick={() => {
                                setNewPointGroupParentId(pointGroup.id)
                                setShowAddPointGroupDialog(true)
                            }}
                        >
                            Add Child Group
                        </button>
                    </div>
                    <div className="flex align-middle justify-center gap-1">
                        <input className="dark:[color-scheme:dark] w-10 h-10" type="checkbox" checked={pointGroup.ranked}
                            onChange={(e) => {
                                updateTempPointGroupState({
                                    ...pointGroup,
                                    ranked: e.target.checked
                                });
                            }} />
                    </div>
                    <div className="flex align-middle justify-center gap-1">
                        <input
                            className="dark:[color-scheme:dark] w-10 h-10 rounded-lg"
                            type="color"
                            value={pointGroup.color}
                            onChange={(e) => {
                                updateTempPointGroupState({
                                    ...pointGroup,
                                    color: e.target.value
                                });
                            }}
                        />
                    </div>
                </div>
                {
                    pointGroup.childGroups !== null && pointGroup.childGroups.length > 0 ? (
                        <div className="col-span-3">
                            {
                                pointGroup.childGroups
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map((childGroup, childIndex) => {
                                        return recursivePointGroupCard(childGroup, ++level);
                                    })
                            }
                        </div>
                    ) : null
                }
            </div>
        )
    }

    const addNewPointGroup = async (parent_id: number | null = null) => {
        const { data, error } = await supabase.from("point_group").insert([
            {
                name: newPointGroupName,
                school_id: parseInt(schoolId),
                parent_id: parent_id,
                ranked: newPointGroupRanked,
                color: newPointGroupColor
            }
        ]);
        if (error) {
            console.error("Error adding new point group", error);
        } else {
            console.log("New point group added");
        }
        fetchPointGroups();
    }

    const [showAddPointGroupDialog, setShowAddPointGroupDialog] = useState<boolean>(false)
    const [newPointGroupName, setNewPointGroupName] = useState<string>("")
    const [newPointGroupRanked, setNewPointGroupRanked] = useState<boolean>(false)
    const [newPointGroupColor, setNewPointGroupColor] = useState<string>("#000000")
    const [newPointGroupParentId, setNewPointGroupParentId] = useState<number | null>(null)
    const addPointGroupDialog = () => {
        return (
            <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-slate-300 dark:bg-slate-700 rounded-lg p-3">
                    <div className="text-lg font-bold">Add New Point Group</div>
                    <div className="grid grid-cols-2 gap-1">
                        <div className="flex justify-center">Group Name</div>
                        <input
                            className="w-40 h-5 p-1 rounded-lg dark:[color-scheme:dark]"
                            type="text"
                            onChange={(e) => setNewPointGroupName(e.target.value)}
                        />
                        <div className="flex justify-center">Ranked</div>
                        <input
                            className="dark:[color-scheme:dark]"
                            type="checkbox"
                            onChange={(e) => setNewPointGroupRanked(e.target.checked)}
                        />
                        <div className="flex justify-center">Color</div>
                        <input
                            className="w-full h-5 dark:[color-scheme:dark]"
                            type="color"
                            onChange={(e) => setNewPointGroupColor(e.target.value)}
                        />
                        <button
                            className="border rounded-lg px-2 py-1 hover:bg-green-300 dark:hover:bg-green-700"
                            onClick={() => {
                                setShowAddPointGroupDialog(false)
                                addNewPointGroup(newPointGroupParentId)
                                setNewPointGroupParentId(null)
                            }}
                            disabled={newPointGroupName.length < 3}
                        >
                            Save
                        </button>
                        <button
                            className="border rounded-lg px-2 py-1 hover:bg-red-300 dark:hover:bg-red-700"
                            onClick={() => {
                                setShowAddPointGroupDialog(false)
                                setNewPointGroupParentId(null)
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="animate-in h-full w-full p-5 overflow-y-scroll">
            {showAddPointGroupDialog && addPointGroupDialog()}
            <div>
                <div className="text-2xl font-bold">Point Groups</div>
                <div className="flex justify-between align-middle">
                    <button
                        className="bg-green-300 dark:bg-green-700 rounded-lg px-3 py-1"
                        onClick={() => setShowAddPointGroupDialog(!showAddPointGroupDialog)}
                    >
                        Add New Point Group
                    </button>
                    <div className="flex gap-1">
                        {
                            anyDiff() && <button
                                className="bg-orange-200 dark:bg-orange-800 rounded-lg px-3 py-1"
                                onClick={() => saveChanges()}
                            >
                                Save Changes
                            </button>
                        }
                        {
                            anyDiff() && <button
                                className="bg-red-300 dark:bg-red-700 rounded-lg px-3 py-1"
                                onClick={() => resetChanges()}
                            >
                                Reset Changes
                            </button>
                        }
                    </div>
                </div>
                {
                    anyDiff() && <div className="text-orange-600 dark:text-orange-400">Components highlighted orange have unsaved changes!</div>
                }
            </div>
            <div className="pt-3 grid grid-cols-1 gap-3">
                <div className="grid grid-cols-3">
                    <div className="flex justify-center align-middle">Group</div>
                    <div className="flex justify-center align-middle">Ranked</div>
                    <div className="flex justify-center align-middle">Color</div>
                </div>
                {
                    tempPointGroups
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((pointGroup, index) => {
                            return (
                                <div className="bg-slate-300 dark:bg-slate-700 px-3 rounded-lg">
                                    {recursivePointGroupCard(pointGroup, 0)}
                                </div>
                            )
                        })
                }
            </div>
        </div>
    )
}