"use client";

import { createClient } from "@/utils/supabase/client";
import { GroupData, Student, Teacher } from "../../dataClasses";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function EditGroupDashboard({ params: { schoolId, groupId } }: { params: { schoolId: string, groupId: string } }) {

    const supabase = createClient();

    const [groupData, setGroupData] = useState<GroupData | null>(null);
    const [parentGroup, setParentGroup] = useState<GroupData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingState, setLoadingState] = useState<string>("Loading...");

    const [studentSearchText, setStudentSearchText] = useState<string>("");
    const [removeMultipleStudentsEnabled, setRemoveMultipleStudentsEnabled] = useState<boolean>(false);
    const [studentsSelectedForRemoval, setStudentsSelectedForRemoval] = useState<number[]>([]);

    const [studentAddSearchText, setStudentAddSearchText] = useState<string>("");
    const [addStudentsModalOpen, setAddStudentsModalOpen] = useState<boolean>(false);
    const [availableStudentsToAdd, setAvailableStudentsToAdd] = useState<Student[]>([]);
    const [studentsSelectedForAddition, setStudentsSelectedForAddition] = useState<number[]>([]);

    async function recursivelyGetGroupData(id: number, topGroup: boolean): Promise<GroupData | null> {
        setLoadingState("Loading Group Data For Group ID: " + id);
        const { data, error } = await supabase
            .from('student_group')
            .select('*, child_groups:student_group (id), school (*), teachers:teacher (*), students:student (*)')
            .eq('id', id)
            .single();

        if (error) {
            console.error(error);
            return null;
        } else {
            var childGroups: GroupData[] | null = null;
            if (topGroup) {
                setLoadingState("Loading Group Data For Group ID: " + id + " (Top Group)");
                if (data.parent_id) {
                    const parentGroupData = await recursivelyGetGroupData(data.parent_id, false);
                    if (parentGroupData !== null) {
                        setParentGroup(
                            new GroupData(
                                parentGroupData.id,
                                parentGroupData.name,
                                false,
                                false,
                                null,
                                null,
                                null,
                                parentGroupData.students?.map((student: any) =>
                                    new Student(
                                        student.id,
                                        student.link_code,
                                        student.powerschool_id,
                                        student.first_name,
                                        student.last_name,
                                        student.birthdate,
                                        student.grade,
                                        student.gender
                                    )
                                )
                            )
                        );
                        setLoadingState("Loading Available Students To Add For Group ID: " + id);
                        setAvailableStudentsToAdd(parentGroupData.students ?? []);
                    }
                } else {
                    setLoadingState("Loading All Students For School ID: " + schoolId);
                    const availableStudents = await supabase.from("student").select("*").eq("school_id", schoolId).then(({ data, error }) => {
                        if (error) {
                            console.error("Error fetching students", error)
                            return []
                        }
                        return data.map((student: any) => new Student(
                            student.id,
                            student.link_code,
                            student.powerschool_id,
                            student.first_name,
                            student.last_name,
                            student.birthdate,
                            student.grade,
                            student.gender,
                        ))
                    })
                    setAvailableStudentsToAdd(availableStudents);
                }
            }
            if (topGroup) {
                setLoadingState("Loading Child Groups For Group ID: " + id)
            }
            await Promise.all(data.child_groups.map(async (childGroup: any) => {
                const childGroupData = await recursivelyGetGroupData(childGroup.id, false);
                if (childGroupData) {
                    if (!childGroups) {
                        childGroups = [];
                    }
                    childGroups.push(childGroupData);
                }
            }));
            if (topGroup) {
                setLoadingState("Loading Teachers For Group ID: " + id)
            }
            return new GroupData(
                data.id,
                data.name,
                false,
                false,
                data.parent_id,
                childGroups,
                data.teachers.map((teacher: any) =>
                    new Teacher(teacher.id, teacher.first_name, teacher.last_name)
                ),
                data.students.map((student: any) =>
                    new Student(
                        student.id,
                        student.link_code,
                        student.powerschool_id,
                        student.first_name,
                        student.last_name,
                        student.birthdate,
                        student.grade,
                        student.gender
                    )
                )
            );
        }
    }

    async function pullGroupData(id: number) {
        setLoadingState("Loading Group Data...");
        setParentGroup(null);
        setGroupData(null);
        const pulledGroupData = await recursivelyGetGroupData(id, true);
        setLoadingState("Loading Complete");
        setLoading(false);
        setGroupData(pulledGroupData);
    }

    useEffect(() => {
        pullGroupData(parseInt(groupId));
    }, []);

    const loadingScreen = () => {
        return (
            <div className="flex items-center justify-center h-screen">
                <div>
                    <div className="text-2xl">Loading...</div>
                    <div className="h-1 bg-slate-300 dark:bg-slate-700" />
                    <div className="pt-3">
                        <div className="flex items-center">
                            <div className="w-full text-center">{loadingState}</div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (loading) {
        return loadingScreen();
    }

    const recursiveChildGroupCard = (group: GroupData) => {
        return (
            <div className="rounded-lg p-1">
                <div className="flex">
                    {group.childGroups && group.childGroups
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(childGroup => (
                            <div
                                className="border px-2 py-1 mx-1 w-fit bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                                key={childGroup.id}
                            >
                                <Link href={`/admin/school/${schoolId}/editGroup/${childGroup.id}`}>
                                    <div>{childGroup.name} [{childGroup.students?.length}]</div>
                                    {
                                        childGroup.childGroups && childGroup.childGroups.length > 0 && (
                                            <div>
                                                <div className="h-1 bg-slate-300 dark:bg-slate-700" />
                                                {recursiveChildGroupCard(childGroup)}
                                            </div>
                                        )
                                    }
                                </Link>
                            </div>
                        ))}
                </div>
            </div>
        )
    }

    const addStudentToGroup = async (studentId: number, groupId: number) => {
        setLoadingState("Adding Student To Group...");
        setLoading(true);
        const { data, error } = await supabase.from("student_group_pair").insert({
            student_id: studentId,
            student_group_id: groupId
        })
        if (error) {
            console.error("Error adding student to group", error)
            setLoading(false);
            return
        }
        console.log("Successfully added student to group");
    }

    const removeStudentFromGroup = async (studentId: number, groupId: number) => {
        setLoadingState("Removing Student From Group...");
        setLoading(true);
        const { data, error } = await supabase.from("student_group_pair").delete().eq("student_id", studentId).eq("student_group_id", groupId)
        if (error) {
            console.error("Error removing student from group", error)
            setLoading(false);
            return
        }
        console.log("Successfully removed student from group");
    }

    const recursivelyRemoveStudentFromGroup = async (studentId: number, groupData: GroupData) => {
        await removeStudentFromGroup(studentId, groupData.id)
        groupData.childGroups?.forEach(async (childGroup: GroupData) => {
            await recursivelyRemoveStudentFromGroup(studentId, childGroup)
        })
        pullGroupData(parseInt(groupId))
    }

    const removeSelectedStudents = async (groupData: GroupData) => {
        setLoadingState("Removing Selected Students...");
        setLoading(true);
        await Promise.all(studentsSelectedForRemoval.map(async studentId => {
            await recursivelyRemoveStudentFromGroup(studentId, groupData)
        }))
        setStudentsSelectedForRemoval([]);
        pullGroupData(groupData.id);
    }

    const addSelectedStudents = async (groupId: number) => {
        setLoadingState("Adding Selected Students...");
        setLoading(true);
        await Promise.all(studentsSelectedForAddition.map(async studentId => {
            await addStudentToGroup(studentId, groupId)
        }))
        setStudentsSelectedForAddition([]);
        pullGroupData(groupId);
    }

    const addStudentsModal = (groupData: GroupData) => {
        return (
            <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
                <div className="w-1/2 max-h-full border rounded-lg p-3 bg-slate-300 dark:bg-slate-700">
                    <div className="text-2xl">Add Students</div>
                    <div className="h-1 bg-slate-300 dark:bg-slate-700" />
                    <div className="pt-1">
                        <input
                            className="w-fit border rounded-lg p-1 my-1 dark:[color-scheme:dark]"
                            type="text"
                            placeholder="Search Students..."
                            value={studentAddSearchText}
                            onChange={e => setStudentAddSearchText(e.target.value)}
                        />
                        <div className="grid grid-cols-4 border-b items-center bg-slate-300 dark:bg-slate-700">
                            <div>First Name</div>
                            <div>Last Name</div>
                            <div>Grade</div>
                            <button
                                className="border bg-transparent hover:bg-green-400 dark:hover:bg-green-600 rounded-lg p-1"
                                onClick={
                                    () => {
                                        addSelectedStudents(groupData.id)
                                        setAddStudentsModalOpen(false)
                                    }
                                }
                            >Add Selected</button>
                        </div>
                        <div className="min-h-96 max-h-96 overflow-y-scroll">
                            {availableStudentsToAdd
                                .filter(student => !groupData.students?.map(student => student.id).includes(student.id))
                                .filter(student => student.firstName.toLowerCase().includes(studentAddSearchText.toLowerCase()) || student.lastName.toLowerCase().includes(studentAddSearchText.toLowerCase()))
                                .map(student => (
                                    <div
                                        className={`grid grid-cols-4 border-b items-center ${studentsSelectedForAddition.includes(student.id) ? "bg-green-200 dark:bg-green-800" : ""}`}
                                        key={student.id}
                                    >
                                        <div>{student.firstName}</div>
                                        <div>{student.lastName}</div>
                                        <div>{student.grade}</div>
                                        <input
                                            type="checkbox"
                                            checked={studentsSelectedForAddition.includes(student.id)}
                                            onChange={() => {
                                                if (studentsSelectedForAddition.includes(student.id)) {
                                                    setStudentsSelectedForAddition(studentsSelectedForAddition.filter(id => id !== student.id))
                                                } else {
                                                    setStudentsSelectedForAddition([...studentsSelectedForAddition, student.id])
                                                }
                                            }}
                                        />
                                    </div>
                                ))}
                        </div>
                    </div>
                    <div className="flex justify-between">
                        <div className="flex gap-1">
                            <div className="pt-3">
                                <button
                                    className="border bg-transparent hover:bg-green-400 dark:hover:bg-green-600 rounded-lg p-1"
                                    onClick={() => {
                                        setStudentsSelectedForAddition(availableStudentsToAdd.map(student => student.id))
                                    }}
                                >Select All</button>
                            </div>
                            <div className="pt-3">
                                <button
                                    className="border bg-transparent hover:bg-red-400 dark:hover:bg-red-600 rounded-lg p-1"
                                    onClick={() => {
                                        setStudentsSelectedForAddition([])
                                    }}
                                >Deselect All</button>
                            </div>
                        </div>
                        <div className="pt-3">
                            <button
                                className="border bg-transparent hover:bg-red-400 dark:hover:bg-red-600 rounded-lg p-1"
                                onClick={() => {
                                    setAddStudentsModalOpen(false)
                                    setAvailableStudentsToAdd([])
                                }}
                            >Close</button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full h-full overflow-y-scroll">
            {addStudentsModalOpen && groupData && addStudentsModal(groupData)}
            <div className="m-3">
                <Link href={`/admin/school/${schoolId}/groups`}>
                    <div className="w-fit px-3 py-1 bg-slate-300 dark:bg-slate-700 rounded-lg">{"< Back to Groups"}</div>
                </Link>
            </div>
            <div>
                <div className="text-2xl">Editing Group: {groupData?.name}</div>
                <div className="h-1 bg-slate-300 dark:bg-slate-700" />
                {groupData && (
                    <div className="pt-3">
                        <div className="border rounded-lg p-1">
                            <div className="text-lg">Group Teachers</div>
                            <div className="h-1 bg-slate-300 dark:bg-slate-700" />
                            <div className="pt-1">
                                <div className="flex">
                                    {groupData.teachers && groupData.teachers.map(teacher => (
                                        <div
                                            className="px-2 py-1 w-fit bg-slate-200 dark:bg-slate-800 rounded-lg"
                                            key={teacher.id}
                                        >
                                            <div>{teacher.firstName} {teacher.lastName}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {
                            parentGroup && (
                                <div className="border rounded-lg p-1 mt-3">
                                    <div className="text-lg">Parent Group</div>
                                    <div className="h-1 bg-slate-300 dark:bg-slate-700" />
                                    <div className="pt-1">
                                        <div className="px-2 py-1 w-fit bg-slate-200 dark:bg-slate-800 rounded-lg">
                                            <Link href={`/admin/school/${schoolId}/editGroup/${parentGroup.id}`}>
                                                <div>{parentGroup.name}</div>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            )
                        }
                        {
                            groupData.childGroups && groupData.childGroups.length > 0 && (
                                <div className="border rounded-lg p-1">
                                    <div className="text-lg">Child Groups [# Students]</div>
                                    <div className="h-1 bg-slate-300 dark:bg-slate-700" />
                                    <div className="pt-1">
                                        <div className="flex">
                                            {recursiveChildGroupCard(groupData)}
                                        </div>
                                    </div>
                                </div>
                            )
                        }
                        <div className="border rounded-lg p-1">
                            <div className="flex gap-1 py-1">
                                <div className="text-lg">Students</div>
                                <button
                                    className="w-fit border bg-transparent hover:bg-green-400 dark:hover:bg-green-600 rounded-lg px-2"
                                    onClick={() => setAddStudentsModalOpen(true)}
                                >Add</button>
                            </div>
                            <div className="h-1 bg-slate-300 dark:bg-slate-700" />
                            <input
                                className="w-fit border rounded-lg p-1 my-1 dark:[color-scheme:dark]"
                                type="text"
                                placeholder="Search Students..."
                                value={studentSearchText}
                                onChange={e => setStudentSearchText(e.target.value)}
                            />
                            <div className="text-red-500">Removing a student will also remove them from all child groups!</div>
                            <div className="pt-1">
                                <div className="grid grid-cols-4 border-b items-center bg-slate-300 dark:bg-slate-700">
                                    <div className="">First Name</div>
                                    <div>Last Name</div>
                                    <div>Grade</div>
                                    <button
                                        className="w-full border bg-transparent hover:bg-red-500 rounded-lg p-1"
                                        onClick={() => {
                                            removeSelectedStudents(groupData)
                                        }}
                                    >Remove Selected</button>
                                </div>
                                {groupData.students && groupData.students
                                    .filter(student => student.firstName.toLowerCase().includes(studentSearchText.toLowerCase()) || student.lastName.toLowerCase().includes(studentSearchText.toLowerCase()))
                                    .map(student => (
                                        <div
                                            className={`grid grid-cols-4 border-b items-center ${studentsSelectedForRemoval.includes(student.id) ? "bg-red-200 dark:bg-red-800" : ""}`}
                                            key={student.id}
                                        >
                                            <div>{student.firstName}</div>
                                            <div>{student.lastName}</div>
                                            <div>{student.grade}</div>
                                            <input
                                                className="dark:[color-scheme:dark]"
                                                type="checkbox"
                                                checked={studentsSelectedForRemoval.includes(student.id)}
                                                onChange={() => {
                                                    if (studentsSelectedForRemoval.includes(student.id)) {
                                                        setStudentsSelectedForRemoval(studentsSelectedForRemoval.filter(id => id !== student.id))
                                                    } else {
                                                        setStudentsSelectedForRemoval([...studentsSelectedForRemoval, student.id])
                                                    }
                                                }}
                                            />
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}