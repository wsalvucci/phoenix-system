"use server";

import { ScorebookData } from "@/app/dataClasses";
import supabaseServiceClient from "../supabaseServiceClient";
import { checkTeacherAccessToStudentGroup } from "./studentGroups/checkTeacherAccessToStudentGroup";
import { Database } from "@/types/supabase";

export async function createPointEvent(studentGroupId: number, pointTemplateId: number, date: string): Promise<boolean> {
    const teacherAccess = await checkTeacherAccessToStudentGroup(studentGroupId);

    if (!teacherAccess) return false;

    const supabase = await supabaseServiceClient();

    const { data, error } = await supabase.from("point_event").insert({
        student_group_id: studentGroupId,
        template_id: pointTemplateId,
        date
    });

    if (error) {
        console.error("Error creating point event", error);
        return false;
    }

    return true;
}

export async function getScorebookData(studentGroupId: number): Promise<ScorebookData> {
    const teacherAccess = await checkTeacherAccessToStudentGroup(studentGroupId);

    if (!teacherAccess) throw new Error("Teacher does not have access to this student group");

    const supabase = await supabaseServiceClient();

    const pointEventsResponse = await supabase.from("point_event").select("*, point_template (*), student_point (*)").eq("student_group_id", studentGroupId);
    const pointTemplatesResponse = await supabase.from("point_template").select("*").eq("student_group_id", studentGroupId);
    const studentPairsResponse = await supabase
        .from("student_group_pair")
        .select("student(*)")
        .eq("student_group_id", studentGroupId);

    if (pointEventsResponse.error) {
        console.error("Error fetching point events", pointEventsResponse.error);
        throw new Error("Error fetching point events");
    }

    if (pointTemplatesResponse.error) {
        console.error("Error fetching point templates", pointTemplatesResponse.error);
        throw new Error("Error fetching point templates");
    }

    if (studentPairsResponse.error) {
        console.error("Error fetching students", studentPairsResponse.error);
        throw new Error("Error fetching students");
    }

    console.log(pointEventsResponse)

    return {
        pointEvents: pointEventsResponse.data.map((pointEventData) => ({
            id: pointEventData.id,
            date: pointEventData.date,
            linkedTemplateData: {
                id: pointEventData.point_template?.id,
                name: pointEventData.point_template?.name
            },
            studentPoints: pointEventData.student_point?.map((studentPointData) => {
                return {
                    studentData: studentPairsResponse.data.find((studentPair) => studentPair.student?.id === studentPointData.student_id)?.student,
                    pointData: studentPointData
                }
            })
        })),
        pointTemplates: pointTemplatesResponse.data,
        students: studentPairsResponse.data.map((studentData) => studentData.student)
    }
}