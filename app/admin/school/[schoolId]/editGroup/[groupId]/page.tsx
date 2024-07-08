"use client";

import { Teacher, StudentGroup, Student } from "@/app/dataClasses"
import { useEffect, useState } from "react";
import Link from "next/link";
import { clientAddStudentGroup, clientAddStudentToStudentGroup, clientAddTeacherToStudentGroup, clientGetStudentGroup, clientRemoveStudentFromStudentGroup, clientRemoveTeacherFromStudentGroup } from "@/app/supaApi/client/admin/studentGroups/adminStudentGroupsApi";
import { clientGetSchoolTeachers } from "@/app/supaApi/client/admin/teachers/adminTeachersApi";

export default function EditGroupDashboard({ params: { schoolId, groupId } }: { params: { schoolId: string, groupId: string } }) {

    const [groupData, setGroupData] = useState<StudentGroup | null>(null);
    const [parentGroup, setParentGroup] = useState<StudentGroup | null>(null);

    const [loading, setLoading] = useState<boolean>(true);
    const [loadingState, setLoadingState] = useState<string>("");
    const [loadingProgress, setLoadingProgress] = useState<number>(0);

    const [teacherSearchText, setTeacherSearchText] = useState<string>("");
    const [teachersSelectedForRemoval, setTeachersSelectedForRemoval] = useState<number[]>([]);

    const [teacherAddSearchText, setTeacherAddSearchText] = useState<string>("");
    const [addTeachersModalOpen, setAddTeachersModalOpen] = useState<boolean>(false);
    const [availableTeachersToAdd, setAvailableTeachersToAdd] = useState<Teacher[]>([]);
    const [teachersSelectedForAddition, setTeachersSelectedForAddition] = useState<number[]>([]);

    const [studentSearchText, setStudentSearchText] = useState<string>("");
    const [studentsSelectedForRemoval, setStudentsSelectedForRemoval] = useState<number[]>([]);

    const [studentAddSearchText, setStudentAddSearchText] = useState<string>("");
    const [addStudentsModalOpen, setAddStudentsModalOpen] = useState<boolean>(false);
    const [availableStudentsToAdd, setAvailableStudentsToAdd] = useState<Student[]>([]);
    const [studentsSelectedForAddition, setStudentsSelectedForAddition] = useState<number[]>([]);

    const [addChildGroupModalOpen, setAddChildGroupModalOpen] = useState<boolean>(false);
    const [newChildGroupName, setNewChildGroupName] = useState<string>("");

    async function pullGroupData(id: number) {
        setParentGroup(null);
        setGroupData(null);
        setLoadingProgress(0);
        setLoadingState("Loading Group Data...");

        await Promise.all([
            (async () => {
                const pulledGroupData = await clientGetStudentGroup(id)
                setGroupData(pulledGroupData);
                setLoadingProgress(loadingProgress + 33);
                setLoadingState("Loaded Base Group Data");
                if (pulledGroupData?.parentGroup && pulledGroupData?.parentGroup !== null) {
                    const parentGroup = await clientGetStudentGroup(pulledGroupData.parentGroup);
                    setParentGroup(parentGroup);
                    setAvailableStudentsToAdd(parentGroup?.students?.filter(student => !pulledGroupData.students?.map(student => student.id).includes(student.id)) ?? [])
                    setLoadingProgress(loadingProgress + 33);
                    setLoadingState("Loaded Parent Group Data");
                }
            })(),
            (async () => {
                const allTeachers = await clientGetSchoolTeachers(parseInt(schoolId));
                const availableTeachers = allTeachers?.filter(teacher => !groupData?.teachers?.map(teacher => teacher.id).includes(teacher.id)) ?? [];
                setAvailableTeachersToAdd(availableTeachers);
                setLoadingProgress(loadingProgress + 33);
                setLoadingState("Loaded Teachers To Add");
            })()
        ])

        setLoadingProgress(100);
        setLoading(false)
    }

    useEffect(() => {
        pullGroupData(parseInt(groupId));
    }, []);

    const loadingScreen = () => {
        return (
            <div className="flex items-center justify-center h-screen">
                <div>
                    <div className="text-2xl">Loading...</div>
                    {/* Loading Progress Bar */}
                    <div className="w-96 h-3 bg-slate-300 dark:bg-slate-700 rounded-lg">
                        <div className="h-full bg-green-400 dark:bg-green-600 rounded-lg" style={{ width: `${loadingProgress}%` }} />
                    </div>
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

    const recursiveChildGroupCard = (group: StudentGroup) => {
        return (
            <div className="w-fit rounded-lg p-1">
                {group.childGroups && group.childGroups
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(childGroup => (
                        <div
                            className="px-2 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                            key={childGroup.id}
                        >
                            <div>
                                <Link href={`/admin/school/${schoolId}/editGroup/${childGroup.id}`}>
                                    <div className="px-1 rounded-lg hover:bg-slate-500">{childGroup.name} [{childGroup.students?.length}]</div>
                                </Link>
                            </div>
                            <div>
                                {recursiveChildGroupCard(childGroup)}
                            </div>
                        </div>
                    ))}
            </div>
        )
    }

    const addStudentToGroup = async (studentId: number, groupId: number) => {
        setLoadingState("Adding Student To Group...");
        setLoading(true);
        await clientAddStudentToStudentGroup(studentId, groupId)
        console.log("Successfully added student to group");
    }

    const removeStudentFromGroup = async (studentId: number, groupId: number) => {
        setLoadingState("Removing Student From Group...");
        setLoading(true);
        await clientRemoveStudentFromStudentGroup(studentId, groupId)
        console.log("Successfully removed student from group");
    }

    const recursivelyRemoveStudentFromGroup = async (studentId: number, groupData: StudentGroup) => {
        await removeStudentFromGroup(studentId, groupData.id)
        groupData.childGroups?.forEach(async (childGroup: StudentGroup) => {
            await recursivelyRemoveStudentFromGroup(studentId, childGroup)
        })
        pullGroupData(parseInt(groupId))
    }

    const removeSelectedStudents = async (groupData: StudentGroup) => {
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

    const addSelectedTeachersToGroup = async (groupId: number) => {
        setLoadingState("Adding Selected Teachers...");
        setLoading(true);
        await Promise.all(teachersSelectedForAddition.map(async teacherId => {
            await clientAddTeacherToStudentGroup(teacherId, groupId)
        }))
        setTeachersSelectedForAddition([]);
        pullGroupData(groupId);
    }

    const removeSelectedTeachersFromGroup = async (groupId: number) => {
        setLoadingState("Removing Selected Teachers...");
        setLoading(true);
        await Promise.all(teachersSelectedForRemoval.map(async teacherId => {
            await clientRemoveTeacherFromStudentGroup(teacherId, groupId)
        }))
        setTeachersSelectedForRemoval([]);
        pullGroupData(groupId);
    }

    const addTeachersModal = (groupData: StudentGroup) => {
        return (
            <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
                <div className="w-1/2 max-h-full border rounded-lg p-3 bg-slate-300 dark:bg-slate-700">
                    <div className="text-2xl">Add Teachers</div>
                    <div className="h-1 bg-slate-300 dark:bg-slate-700" />
                    <div className="pt-1">
                        <input
                            className="w-fit border rounded-lg p-1 my-1 dark:[color-scheme:dark]"
                            type="text"
                            placeholder="Search Teachers..."
                            value={teacherAddSearchText}
                            onChange={e => setTeacherAddSearchText(e.target.value)}
                        />
                        <div className="grid grid-cols-3 border-b items-center bg-slate-300 dark:bg-slate-700">
                            <div>First Name</div>
                            <div>Last Name</div>
                            <button
                                className="border bg-transparent hover:bg-green-400 dark:hover:bg-green-600 rounded-lg p-1"
                                onClick={
                                    () => {
                                        addSelectedTeachersToGroup(groupData.id)
                                        setAddTeachersModalOpen(false)
                                    }
                                }
                            >Add Selected</button>
                        </div>
                        <div className="min-h-96 max-h-96 overflow-y-scroll">
                            {availableTeachersToAdd
                                .filter(teacher => !groupData.teachers?.map(teacher => teacher.id).includes(teacher.id))
                                .filter(teacher => teacher.firstName.toLowerCase().includes(teacherAddSearchText.toLowerCase()) || teacher.lastName.toLowerCase().includes(teacherAddSearchText.toLowerCase()))
                                .map(teacher => (
                                    <div
                                        className={`grid grid-cols-3 border-b items-center ${teachersSelectedForAddition.includes(teacher.id) ? "bg-green-200 dark:bg-green-800" : ""}`}
                                        key={teacher.id}
                                    >
                                        <div>{teacher.firstName}</div>
                                        <div>{teacher.lastName}</div>
                                        <input
                                            type="checkbox"
                                            checked={teachersSelectedForAddition.includes(teacher.id)}
                                            onChange={() => {
                                                if (teachersSelectedForAddition.includes(teacher.id)) {
                                                    setTeachersSelectedForAddition(teachersSelectedForAddition.filter(id => id !== teacher.id))
                                                } else {
                                                    setTeachersSelectedForAddition([...teachersSelectedForAddition, teacher.id])
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
                                        setTeachersSelectedForAddition(availableTeachersToAdd.map(teacher => teacher.id))
                                    }}
                                >Select All</button>
                            </div>
                            <div className="pt-3">
                                <button
                                    className="border bg-transparent hover:bg-red-400 dark:hover:bg-red-600 rounded-lg p-1"
                                    onClick={() => {
                                        setTeachersSelectedForAddition([])
                                    }}
                                >Deselect All</button>
                            </div>
                        </div>
                        <div className="pt-3">
                            <button
                                className="border bg-transparent hover:bg-red-400 dark:hover:bg-red-600 rounded-lg p-1"
                                onClick={() => {
                                    setAddTeachersModalOpen(false)
                                }}
                            >Close</button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const addStudentsModal = (groupData: StudentGroup) => {
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
                                }}
                            >Close</button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const addChildGroup = async () => {
        setLoadingState("Adding Child Group...");
        setLoading(true);
        await clientAddStudentGroup(parseInt(schoolId), newChildGroupName, groupData ? groupData.id : null)
        setAddChildGroupModalOpen(false);
        setNewChildGroupName("");
        pullGroupData(parseInt(groupId));
    }

    const addChildGroupModal = () => {
        return (
            <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
                <div className="w-1/2 max-h-full border rounded-lg p-3 bg-slate-300 dark:bg-slate-700">
                    <div className="text-2xl">Add Child Group</div>
                    <div className="h-1 bg-slate-300 dark:bg-slate-700" />
                    <div className="pt-1">
                        <input
                            className="w-full p-3 my-1 dark:bg-slate-700 border border-gray-300 rounded-md dark:[color-scheme:dark]"
                            type="text"
                            placeholder="Group Name"
                            onChange={e => setNewChildGroupName(e.target.value)}
                        />
                        <button
                            className="w-full p-3 my-1 rounded-lg bg-green-300 dark:bg-green-700 hover:bg-green-400 dark:hover:bg-green-600"
                            onClick={addChildGroup}
                        >
                            Confirm
                        </button>
                        <button
                            className="w-full p-3 my-1 rounded-lg bg-red-300 dark:bg-red-700 hover:bg-red-400 dark:hover:bg-red-600"
                            onClick={() => {
                                setAddChildGroupModalOpen(false)
                                setNewChildGroupName("")
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
        <div className="animate-in w-full h-full overflow-y-scroll">
            {addStudentsModalOpen && groupData && addStudentsModal(groupData)}
            {addTeachersModalOpen && groupData && addTeachersModal(groupData)}
            {addChildGroupModalOpen && addChildGroupModal()}
            <div className="m-3">
                <Link href={`/admin/school/${schoolId}/groups`}>
                    <div className="w-fit px-3 py-1 bg-slate-300 dark:bg-slate-700 rounded-lg">{"< Back to Groups"}</div>
                </Link>
            </div>
            <div className="px-2">
                <div className="text-2xl">Editing Group: {groupData?.name}</div>
                <div className="h-1 bg-slate-300 dark:bg-slate-700" />
                {groupData && (
                    <div className="pt-3 grid grid-cols-2 h-fit">
                        <div className="border-2 rounded-lg p-1 bg-slate-200 dark:bg-slate-800 h-full w-full">
                            <div className="flex gap-1 py-1">
                                <div className="text-lg">Teachers</div>
                                <button
                                    className="w-fit border bg-transparent hover:bg-green-400 dark:hover:bg-green-600 rounded-lg px-2"
                                    onClick={() => setAddTeachersModalOpen(true)}
                                >Add</button>
                            </div>
                            <div className="h-1 bg-slate-300 dark:bg-slate-700" />
                            <input
                                className="w-fit border rounded-lg p-1 my-1 dark:[color-scheme:dark]"
                                type="text"
                                placeholder="Search Teachers..."
                                value={teacherSearchText}
                                onChange={e => setTeacherSearchText(e.target.value)}
                            />
                            <div className="pt-1">
                                <div className="grid grid-cols-3 border-b items-center bg-slate-300 dark:bg-slate-700">
                                    <div>First Name</div>
                                    <div>Last Name</div>
                                    <button
                                        className="w-full border bg-transparent hover:bg-red-500 rounded-lg p-1"
                                        onClick={() => {
                                            removeSelectedTeachersFromGroup(groupData.id)
                                        }}
                                        disabled={teachersSelectedForRemoval.length === 0}
                                    >Remove Selected</button>
                                </div>
                                {groupData.teachers && groupData.teachers
                                    .filter(teacher => teacher.firstName.toLowerCase().includes(teacherSearchText.toLowerCase()) || teacher.lastName.toLowerCase().includes(teacherSearchText.toLowerCase()))
                                    .map(teacher => (
                                        <div
                                            className={`grid grid-cols-3 border-b items-center ${teachersSelectedForRemoval.includes(teacher.id) ? "bg-red-200 dark:bg-red-800" : ""}`}
                                            key={teacher.id}
                                        >
                                            <div>{teacher.firstName}</div>
                                            <div>{teacher.lastName}</div>
                                            <input
                                                className="dark:[color-scheme:dark]"
                                                type="checkbox"
                                                checked={teachersSelectedForRemoval.includes(teacher.id)}
                                                onChange={() => {
                                                    if (teachersSelectedForRemoval.includes(teacher.id)) {
                                                        setTeachersSelectedForRemoval(teachersSelectedForRemoval.filter(id => id !== teacher.id))
                                                    } else {
                                                        setTeachersSelectedForRemoval([...teachersSelectedForRemoval, teacher.id])
                                                    }
                                                }}
                                            />
                                        </div>
                                    ))}
                            </div>
                        </div>
                        <div>
                            {
                                parentGroup ? (
                                    <div className="border-2 rounded-lg p-1 bg-slate-200 dark:bg-slate-800 h-fit w-full">
                                        <div className="text-lg">Parent Group</div>
                                        <div className="h-1 bg-slate-300 dark:bg-slate-700" />
                                        <div className="pt-1">
                                            <div className="px-2 py-1 w-fit bg-slate-200 dark:bg-slate-800 rounded-lg hover:bg-slate-500">
                                                <Link href={`/admin/school/${schoolId}/editGroup/${parentGroup.id}`}>
                                                    <div>{parentGroup.name}</div>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-fit w-full flex justify-center align-middle border-2 rounded-lg p-1 bg-slate-200 dark:bg-slate-800">
                                        <div>
                                            No Parent Group
                                        </div>
                                    </div>
                                )
                            }
                            {
                                groupData.childGroups && groupData.childGroups.length > 0 ? (
                                    <div className="border-2 rounded-lg p-1 bg-slate-200 dark:bg-slate-800 h-fit w-full">
                                        <div className="flex gap-1">
                                            <div className="text-lg">Child Groups [# Students]</div>
                                            <button
                                                className="w-fit border bg-transparent hover:bg-green-400 dark:hover:bg-green-600 rounded-lg px-2"
                                                onClick={() => setAddChildGroupModalOpen(true)}
                                            >Add</button>
                                        </div>
                                        <div className="h-1 bg-slate-300 dark:bg-slate-700" />
                                        <div className="pt-1">
                                            <div>
                                                {recursiveChildGroupCard(groupData)}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border-2 rounded-lg p-1 bg-slate-200 dark:bg-slate-800 h-full w-full">
                                        <div className="flex gap-1">
                                            <div className="text-lg">No Child Groups</div>
                                            <button
                                                className="w-fit border bg-transparent hover:bg-green-400 dark:hover:bg-green-600 rounded-lg px-2"
                                                onClick={() => setAddChildGroupModalOpen(true)}
                                            >Add</button>
                                        </div>
                                    </div>
                                )
                            }
                        </div>
                        <div className="border-2 rounded-lg p-1 my-2 bg-slate-200 dark:bg-slate-800 w-full col-span-3">
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
                                        disabled={studentsSelectedForRemoval.length === 0}
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