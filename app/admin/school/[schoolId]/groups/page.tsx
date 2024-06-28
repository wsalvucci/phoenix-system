"use client";

import { createClient } from "@/utils/supabase/client"
import { useEffect, useState } from "react";
import { createGroup } from "../actions";
import Link from "next/link";
import { group } from "console";
import { Student, Teacher, GroupData } from "../dataClasses";



export default function GroupsDashboard({ params: { schoolId } }: { params: { schoolId: string } }) {

    const supabase = createClient();

    const [loading, setLoading] = useState<boolean>(true);

    const [groups, setGroups] = useState<GroupData[]>([]);
    const [addGroupDialogOpen, setAddGroupDialogOpen] = useState<boolean>(false);
    const [groupNameTooShortError, setGroupNameTooShortError] = useState<boolean>(true);
    const [newGroupName, setNewGroupName] = useState<string>("");
    const [groupSearchText, setGroupSearchText] = useState<string>("");

    const [newGroupParent, setNewGroupParent] = useState<GroupData | null>(null);

    const [searchTeachersText, setSearchTeachersText] = useState<string>("");
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [addTeacherDialogOpen, setAddTeacherDialogOpen] = useState<boolean>(false);
    const [newTeacherGroup, setNewTeacherGroup] = useState<GroupData | null>(null);

    const [searchAvailableStudentsText, setSearchAvailableStudentsText] = useState<string>("");
    const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
    const [searchGroupStudentsText, setSearchGroupStudentsText] = useState<string>("");
    const [groupStudents, setGroupStudents] = useState<Student[]>([]);
    const [originalGroupStudents, setOriginalGroupStudents] = useState<Student[]>([]);
    const [manageStudentsGroup, setManageStudentsGroup] = useState<GroupData | null>(null);
    const [manageStudentsDialogOpen, setManageStudentsDialogOpen] = useState<boolean>(false);
    const [totalStudentRoster, setTotalStudentRoster] = useState<Student[]>([]);

    const getGroup = async (groupId: number): Promise<GroupData | null> => {
        const { data: groupData, error } = await supabase.from("student_group").select("*, child_groups:student_group (id), school (*), teachers:teacher (*), students:student (*)").eq("id", groupId);
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
                false,
                false,
                firstGroup.parent_id,
                childGroups,
                firstGroup.teachers.map((teacher: any) =>
                    new Teacher(teacher.id,
                        teacher.first_name,
                        teacher.last_name
                    )
                ),
                firstGroup.students.map((student: any) =>
                    new Student(student.id,
                        student.link_code,
                        student.powerschool_id,
                        student.first_name,
                        student.last_name,
                        new Date(student.birthdate),
                        student.grade,
                        student.gender,
                    )
                )
            );
            return newGroup;
        }
    }

    const fetchGroups = async () => {
        const { data: groupData, error } = await supabase.from("student_group").select("id").eq("school_id", schoolId);
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

    const fetchTeachers = async () => {
        const { data: teacherData, error } = await supabase.from("teacher").select("*").eq("school_id", schoolId);
        if (error) {
            console.error("Error fetching teachers", error);
        } else if (teacherData === null || teacherData.length === 0) {
            console.log("No teachers found for school: " + schoolId);
        } else {
            setTeachers(teacherData.map((teacher: any) =>
                new Teacher(teacher.id,
                    teacher.first_name,
                    teacher.last_name
                )
            ));
        }

    }

    const fetchStudents = async () => {
        const { data: studentData, error } = await supabase.from("student").select("*").eq("school_id", schoolId);
        if (error) {
            console.error("Error fetching students", error);
        } else if (studentData === null || studentData.length === 0) {
            console.log("No students found for school: " + schoolId);
        } else {
            setTotalStudentRoster(studentData.map((student: any) =>
                new Student(student.id,
                    student.link_code,
                    student.powerschool_id,
                    student.first_name,
                    student.last_name,
                    new Date(student.birthdate),
                    student.grade,
                    student.gender,
                )
            ));
        }
    }

    useEffect(() => {
        fetchGroups();
        fetchTeachers();
        fetchStudents();
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

    const addTeacherToGroup = async (teacherId: number, groupId: number) => {
        setLoading(true);
        const { data, error } = await supabase.from("teacher_student_group_pair").insert({
            teacher_id: teacherId,
            group_id: groupId
        })
        if (error) {
            console.error("Error adding teacher to group", error)
            setLoading(false);
            return
        }
        console.log("Successfully added teacher to group");
        fetchGroups();
    }

    const removeTeacherFromGroup = async (teacherId: number, groupId: number) => {
        setLoading(true);
        const { data, error } = await supabase.from("teacher_student_group_pair").delete().eq("teacher_id", teacherId).eq("group_id", groupId)
        if (error) {
            console.error("Error removing teacher from group", error)
            return
        }
        console.log("Successfully removed teacher from group");
        fetchGroups();
    }

    const addTeacherDialog = () => {
        return (
            <div className="px-4 py-2 dark:bg-slate-700 border border-gray-300 rounded-md w-1/2 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div>
                    Add New Teacher
                </div>
                <input className="w-full p-3 my-1 dark:bg-slate-700 border border-gray-300 rounded-md" type="text" placeholder="Search Teachers" onChange={(e) => setSearchTeachersText(e.target.value)} />
                <div>
                    {
                        teachers
                            .filter((teacher: Teacher) => teacher.firstName.toLowerCase().includes(searchTeachersText.toLowerCase()) || teacher.lastName.toLowerCase().includes(searchTeachersText.toLowerCase()))
                            .filter((teacher: Teacher) => !newTeacherGroup?.teachers?.map((teacher: Teacher) => teacher.id).includes(teacher.id))
                            .map((teacher: Teacher) => {
                                return (
                                    <div
                                        key={teacher.id}
                                        className="flex items-center gap-2"
                                    >
                                        <button
                                            className="rounded-lg bg-green-200 dark:bg-green-800 px-2"
                                            onClick={() => {
                                                setAddTeacherDialogOpen(false)
                                                addTeacherToGroup(teacher.id, newTeacherGroup?.id || 0)
                                            }}
                                        >
                                            +
                                        </button>
                                        <div>{teacher.firstName} {teacher.lastName}</div>
                                    </div>
                                )
                            })
                    }
                </div>
                <button
                    className="w-full p-3 my-1 rounded-lg bg-red-300 dark:bg-red-700 hover:bg-red-400 dark:hover:bg-red-600"
                    onClick={() => setAddTeacherDialogOpen(!addTeacherDialogOpen)}
                >
                    Cancel
                </button>
            </div>
        )
    }

    const addStudentToGroup = async (studentId: number, groupId: number) => {
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
        groupData.childGroups?.forEach(async (childGroup: GroupData) => {
            await recursivelyRemoveStudentFromGroup(studentId, childGroup)
        })
        await removeStudentFromGroup(studentId, groupData.id)
    }

    const commitStudentGroupChanges = async (groupData: GroupData) => {
        setLoading(true);
        originalGroupStudents.forEach(async (student: Student) => {
            if (!groupStudents.map((student: Student) => student.id).includes(student.id)) {
                recursivelyRemoveStudentFromGroup(student.id, groupData)
            }
        })
        groupStudents.forEach(async (student: Student) => {
            if (!originalGroupStudents.map((student: Student) => student.id).includes(student.id)) {
                await addStudentToGroup(student.id, manageStudentsGroup?.id || 0)
            }
        })
        await fetchGroups();
        setLoading(false);
    }

    const manageStudentsDialog = () => {
        return (
            <div className="w-full h-full bg-black bg-opacity-50 absolute top-0 left-0 flex items-center justify-center">
                <div className="px-4 py-2 dark:bg-slate-700 border border-gray-300 rounded-md w-1/2 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div>
                        Manage Students for {manageStudentsGroup?.name}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <input className="w-full p-3 my-1 dark:bg-slate-700 border border-gray-300 rounded-md" type="text" placeholder="Search Available Students" onChange={(e) => setSearchAvailableStudentsText(e.target.value)} />
                        <input className="w-full p-3 my-1 dark:bg-slate-700 border border-gray-300 rounded-md" type="text" placeholder="Search Group Students" onChange={(e) => setSearchGroupStudentsText(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <div>
                                Available Students
                            </div>
                            <div className="min-h-96 max-h-96 overflow-y-scroll dark:[color-scheme:dark]">
                                {
                                    availableStudents
                                        .filter((student: Student) => student.firstName.toLowerCase().includes(searchAvailableStudentsText.toLowerCase()) || student.lastName.toLowerCase().includes(searchAvailableStudentsText.toLowerCase()))
                                        .filter((student: Student) => !groupStudents.map((student: Student) => student.id).includes(student.id))
                                        .map((student: Student) => {
                                            return (
                                                <div
                                                    key={student.id}
                                                    className="flex items-center gap-2"
                                                >
                                                    <button
                                                        className="rounded-lg bg-green-200 dark:bg-green-800 px-2"
                                                        onClick={() => {
                                                            setGroupStudents([...groupStudents, student])
                                                            setAvailableStudents(availableStudents.filter((availableStudent: Student) => availableStudent.id !== student.id))
                                                        }}
                                                    >
                                                        +
                                                    </button>
                                                    <div>{student.firstName} {student.lastName}</div>
                                                </div>
                                            )
                                        })
                                }
                            </div>
                            <div>
                                <button
                                    className="rounded-lg bg-green-200 dark:bg-green-800 px-2"
                                    onClick={() => {
                                        setGroupStudents([...groupStudents, ...availableStudents])
                                        setAvailableStudents([])
                                    }}
                                >
                                    Add All
                                </button>
                            </div>
                        </div>
                        <div>
                            <div>
                                Group Students
                            </div>
                            <div className="min-h-96 max-h-96 overflow-y-scroll dark:[color-scheme:dark]">
                                {
                                    groupStudents
                                        .filter((student: Student) => student.firstName.toLowerCase().includes(searchGroupStudentsText.toLowerCase()) || student.lastName.toLowerCase().includes(searchGroupStudentsText.toLowerCase()))
                                        .map((student: Student) => {
                                            return (
                                                <div
                                                    key={student.id}
                                                    className="flex items-center gap-2"
                                                >
                                                    <button
                                                        className="rounded-lg bg-red-300 dark:bg-red-700 px-2"
                                                        onClick={() => {
                                                            setAvailableStudents([...availableStudents, student])
                                                            setGroupStudents(groupStudents.filter((groupStudent: Student) => groupStudent.id !== student.id))
                                                        }}
                                                    >
                                                        -
                                                    </button>
                                                    <div>{student.firstName} {student.lastName}</div>
                                                </div>

                                            )
                                        })
                                }
                            </div>
                            <div>
                                <button
                                    className="rounded-lg bg-red-300 dark:bg-red-700 px-2"
                                    onClick={() => {
                                        setGroupStudents([])
                                        setAvailableStudents([...availableStudents, ...groupStudents])
                                    }}
                                >
                                    Remove All
                                </button>
                            </div>
                        </div>
                    </div>
                    <button
                        className="w-1/2 p-3 my-1 rounded-lg bg-green-300 dark:bg-green-700 hover:bg-green-400 dark:hover:bg-green-600"
                        onClick={() => {
                            setLoading(true);
                            setManageStudentsDialogOpen(false);
                            if (manageStudentsGroup !== null) {
                                commitStudentGroupChanges(manageStudentsGroup);
                            }
                        }}
                    >
                        Commit Changes
                    </button>
                    <button
                        className="w-1/2 p-3 my-1 rounded-lg bg-red-300 dark:bg-red-700 hover:bg-red-400 dark:hover:bg-red-600"
                        onClick={() => setManageStudentsDialogOpen(!manageStudentsDialogOpen)}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        )
    }

    const groupCard = (groupData: GroupData) => {
        return (
            <div
                key={groupData.id}
                className={`w-full py-1 my-3 ps-5 rounded-lg border ${(groupData.name.toLowerCase().includes(groupSearchText.toLowerCase()) && groupSearchText !== "") ? "bg-slate-400 dark:bg-slate-600" : "bg-slate-300 dark:bg-slate-700"} `}
            >
                <div className="flex justify-between items-center mx-5 gap-1">
                    <div className="flex items-center gap-2">
                        <div className="text-lg font-bold">{groupData.name}</div>
                        <div>
                            <Link href={`/admin/school/${schoolId}/editGroup/${groupData.id}`}>
                                <button
                                    className="rounded-lg bg-orange-200 dark:bg-orange-800 px-2"
                                >
                                    /
                                </button>
                            </Link>
                        </div>
                        <div>
                            <button
                                className="rounded-lg bg-green-200 dark:bg-green-800 px-2"
                                onClick={() => {
                                    setNewGroupParent(groupData)
                                    setAddGroupDialogOpen(!addGroupDialogOpen)
                                }}
                            >
                                +
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div>
                            {groupData.students?.length || 0} {groupData.students?.length === 1 ? "Student" : "Students"}
                        </div>
                        <div>
                            {/* <Link href={`/admin/school/${schoolId}/editGroup/${groupData.id}`}> */}
                            <button
                                className="rounded-lg bg-teal-300 dark:bg-teal-700 px-2"
                                onClick={() => {
                                    setManageStudentsGroup(groupData)
                                    var studentsAvailable: Student[] = []
                                    if (groupData.parentGroup !== null) {
                                        studentsAvailable = groups
                                            .find((searchedGroup: GroupData) =>
                                                searchedGroup.id === groupData.parentGroup
                                            )?.students || []
                                    } else {
                                        studentsAvailable = totalStudentRoster
                                    }
                                    studentsAvailable = studentsAvailable.filter((student: Student) => !groupData.students?.map((student: Student) => student.id).includes(student.id))
                                    setAvailableStudents(studentsAvailable)
                                    setGroupStudents(groupData.students || [])
                                    setOriginalGroupStudents(groupData.students || [])
                                    setManageStudentsDialogOpen(!manageStudentsDialogOpen)
                                }}
                            >
                                Manage Students
                            </button>
                            {/* </Link> */}
                        </div>
                    </div>
                </div>
                <div>
                    {
                        groupData.teachers?.map((teacher: Teacher) => {
                            return (
                                <div key={teacher.id} className="flex items-center mx-5 gap-1">
                                    <div>
                                        <button
                                            className="rounded-lg bg-red-300 dark:bg-red-700 px-2"
                                            onClick={() => removeTeacherFromGroup(teacher.id, groupData.id)}
                                        >
                                            X
                                        </button>
                                    </div>
                                    <div className="text-md">{teacher.firstName} {teacher.lastName}</div>
                                </div>
                            )
                        })
                    }
                </div>
                <button
                    className="px-2 mx-5 mt-3 text-sm rounded-lg bg-slate-400 dark:bg-slate-600 hover:bg-slate-500 dark:hover:bg-slate-500"
                    onClick={() => {
                        setNewTeacherGroup(groupData)
                        setAddTeacherDialogOpen(!addTeacherDialogOpen)
                    }}
                >
                    Add Teacher
                </button>
                {
                    groupData.childGroups?.length !== 0 &&
                    <div className="h-1 bg-slate-400 dark:bg-slate-600 my-2" />
                }
                {
                    groupData.childGroups
                        ?.sort((a: GroupData, b: GroupData) => a.name.localeCompare(b.name))
                        .map((childGroup: GroupData) => groupCard(childGroup))
                }
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
                    <button
                        className={`p-3 m-1 rounded-lg ${groups.filter((groupData: GroupData) => groupData.edited).length === 0 ?
                            "bg-slate-500 text-slate-700" :
                            "bg-yellow-300 dark:bg-yellow-700 hover:bg-yellow-400 dark:hover:bg-yellow-600"
                            }`}
                        disabled={groups.filter((groupData: GroupData) => groupData.edited).length === 0}
                        onClick={() => {
                            groups.forEach(async (groupData: GroupData) => {
                                if (groupData.edited) {
                                    console.log("Updating group: ", groupData)
                                    const result = await supabase.from("group").update({
                                        name: groupData.name
                                    }).eq("id", groupData.id).select("*")
                                    console.log("Result: ", result)
                                }
                                groupData.edited = false
                            })
                            fetchGroups()
                            console.log("Successfully updated students")
                        }}
                    >
                        Save Changes
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
                            .filter((groupData: GroupData) => groupData.parentGroup === null)
                            .filter((groupData: GroupData) => groupSearchText === "" || groupContainsText(groupData, groupSearchText))
                            .sort((a: GroupData, b: GroupData) => a.name.localeCompare(b.name))
                            .map((groupData: GroupData) => groupCard(groupData))
                    }
                </div>
            </div>
            {addGroupDialogOpen && addGroupDialog()}
            {addTeacherDialogOpen && addTeacherDialog()}
            {manageStudentsDialogOpen && manageStudentsDialog()}
        </div>
    )
}