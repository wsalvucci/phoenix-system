"use server";

import { ScorebookData, ScorebookPointEvent } from "@/app/dataClasses";
import supabaseServiceClient from "../supabaseServiceClient";
import { checkTeacherAccessToStudentGroup } from "./studentGroups/checkTeacherAccessToStudentGroup";
import { Database } from "@/types/supabase";

export async function createPointEvent(studentGroupId: number, pointTemplateId: number, date: string): Promise<boolean> {
    const teacherAccess = await checkTeacherAccessToStudentGroup(studentGroupId);

    if (!teacherAccess) return false;

    const supabase = await supabaseServiceClient();

    const { data: pointEventData, error: pointEventError } = await supabase.from("point_event").insert({
        student_group_id: studentGroupId,
        template_id: pointTemplateId,
        date
    }).select("*").single();

    if (pointEventError) {
        console.error("Error creating point event", pointEventError);
        return false;
    }

    const { data: studentGroupPairsData, error: studentGroupPairsError } = await supabase.from("student_group_pair").select("student(*)").eq("student_group_id", studentGroupId);

    if (studentGroupPairsError) {
        console.error("Error fetching student group pairs", studentGroupPairsError);
        return false;
    }

    const newStudentPoints = studentGroupPairsData.map((studentPair) => {
        if (studentPair.student === null) return null;
        return {
            student_id: studentPair.student.id,
            point_event_id: pointEventData.id,
            point_value: 0
        }
    }).filter((studentPoint) => studentPoint !== null);

    const { data: studentPointsData, error: studentPointsError } = await supabase.from("student_point").insert(newStudentPoints)

    if (studentPointsError) {
        console.error("Error creating student points", studentPointsError);
        return false;
    }

    return true;
}

export async function getScorebookData(studentGroupId: number): Promise<ScorebookData> {
    const teacherAccess = await checkTeacherAccessToStudentGroup(studentGroupId);

    if (!teacherAccess) throw new Error("Teacher does not have access to this student group");

    const supabase = await supabaseServiceClient();

    const pointEventsResponse = await supabase.from("point_event").select("*, point_template (*, point_conversion_rule (*, point_conversion_rule_type (*))), student_point (*)").eq("student_group_id", studentGroupId);
    const pointTemplatesResponse = await supabase.from("point_template").select("*").eq("student_group_id", studentGroupId);
    const studentPairsResponse = await supabase
        .from("student_group_pair")
        .select("student(*)")
        .eq("student_group_id", studentGroupId);
    const studentGroupResponse = await supabase.from("student_group").select("*").eq("id", studentGroupId).single();

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

    if (studentGroupResponse.error) {
        console.error("Error fetching student group", studentGroupResponse.error);
        throw new Error("Error fetching student group");
    }

    console.log(pointEventsResponse)

    return {
        pointEvents: pointEventsResponse.data.map((pointEventData) => ({
            id: pointEventData.id,
            date: pointEventData.date,
            name: pointEventData.name,
            student_group_id: pointEventData.student_group_id,
            template_id: pointEventData.template_id,
            linkedTemplateData: {
                id: pointEventData.point_template?.id,
                name: pointEventData.point_template?.name,
                conversionRule: pointEventData.point_template?.point_conversion_rule && {
                    id: pointEventData.point_template.point_conversion_rule.id,
                    name: pointEventData.point_template.point_conversion_rule.name,
                    value: pointEventData.point_template.point_conversion_rule.value
                } || null,
                conversionRuleType: pointEventData.point_template?.point_conversion_rule?.point_conversion_rule_type ?? null
            },
            studentPoints: pointEventData.student_point?.map((studentPointData) => {
                const searchedStudentData = studentPairsResponse.data.find((studentPair) => studentPair.student?.id === studentPointData.student_id)?.student;
                if (!searchedStudentData) return null;
                return {
                    studentData: searchedStudentData,
                    pointData: studentPointData
                }
            }).filter((studentPoint) => studentPoint !== null)
        })).sort((a, b) => {
            if (a.date && b.date) {
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            }
            return 0;
        }),
        pointTemplates: pointTemplatesResponse.data,
        students: studentPairsResponse.data.map((studentData) => studentData.student),
        studentGroup: studentGroupResponse.data
    }
}

export async function editPointEvent(scorebookPointEvent: ScorebookPointEvent): Promise<boolean> {
    const teacherAccess = await checkTeacherAccessToStudentGroup(scorebookPointEvent.student_group_id);

    if (!teacherAccess) return false;

    const supabase = await supabaseServiceClient();

    const { data: currentPointEventData, error: currentPointEventError } = await supabase.from("point_event").select("*").eq("id", scorebookPointEvent.id).single();

    if (currentPointEventError) {
        console.error("Error fetching current point event", currentPointEventError);
        return false;
    }

    if (!currentPointEventData) {
        console.error("Point event not found");
        return false;
    }

    if (currentPointEventData.student_group_id !== scorebookPointEvent.student_group_id) {
        console.error("Teacher does not have access to this point event");
        return false;
    }

    const { data, error } = await supabase.from("point_event").upsert({
        id: scorebookPointEvent.id,
        date: scorebookPointEvent.date,
        name: scorebookPointEvent.name,
        student_group_id: scorebookPointEvent.student_group_id,
        template_id: scorebookPointEvent.template_id
    });

    if (error) {
        console.error("Error editing point event", error);
        return false;
    }

    const newStudentPoints = scorebookPointEvent.studentPoints?.map((studentPoint) => {
        return {
            id: studentPoint.pointData.id,
            student_id: studentPoint.studentData.id,
            point_value: studentPoint.pointData.point_value,
            point_event_id: scorebookPointEvent.id
        }
    })

    if (!newStudentPoints) return true;

    const { data: updateStudentPointsData, error: updateStudentPointsError } = await supabase.from("student_point").upsert(newStudentPoints);

    if (updateStudentPointsError) {
        console.error("Error updating student points", updateStudentPointsError);
        return false;
    }

    return true;
}