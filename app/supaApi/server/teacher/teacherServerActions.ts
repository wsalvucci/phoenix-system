"use server";

import { ClassConfigurationData, ScorebookData, ScorebookPointEvent } from "@/app/dataClasses";
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

    const pointEventsResponse = await supabase.from("point_event").select("*, point_template (*, point_conversion_rule (*, point_conversion_rule_type (*)), point_group (*)), student_point (*)").eq("student_group_id", studentGroupId);
    const pointTemplatesResponse = await supabase.from("point_template").select("*").eq("student_group_id", studentGroupId);
    const studentPairsResponse = await supabase
        .from("student_group_pair")
        .select("student(*)")
        .eq("student_group_id", studentGroupId);
    const studentGroupResponse = await supabase.from("student_group").select("*").eq("id", studentGroupId).single();
    let pointGroupsResponseData: Database['public']['Tables']['point_group']['Row'][] | null = null;
    if (studentGroupResponse.data?.school_id) {
        pointGroupsResponseData = (await supabase.from("point_group").select("*").eq("school_id", studentGroupResponse.data?.school_id)).data;
    }

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
                    value: pointEventData.point_template.point_conversion_rule.value,
                    target: pointEventData.point_template.point_conversion_rule.target,
                } || null,
                conversionRuleType: pointEventData.point_template?.point_conversion_rule?.point_conversion_rule_type ?? null,
                pointGroup: pointEventData.point_template?.point_group ?? null
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
        studentGroup: studentGroupResponse.data,
        pointGroups: pointGroupsResponseData
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

export async function getConfigurationData(studentGroupId: number): Promise<ClassConfigurationData> {
    const teacherAccess = await checkTeacherAccessToStudentGroup(studentGroupId);

    if (!teacherAccess) throw new Error("Teacher does not have access to this student group");

    const supabase = await supabaseServiceClient();

    const { data: templateData, error: templateDataError } = await supabase.from("point_template").select("*, point_conversion_rule (*, point_conversion_rule_type (*)), point_template_type (*), point_group (*)").eq("student_group_id", studentGroupId);

    if (templateDataError) {
        console.error("Error fetching point templates", templateDataError);
        throw new Error("Error fetching point templates");
    }

    return {
        templates: templateData.map((template) => {
            return {
                id: template.id,
                name: template.name,
                conversionRule: template.point_conversion_rule ? {
                    id: template.point_conversion_rule.id,
                    name: template.point_conversion_rule.name,
                    value: template.point_conversion_rule.value,
                    target: template.point_conversion_rule.target,
                    formula: template.point_conversion_rule.formula,
                    ruleType: template.point_conversion_rule.point_conversion_rule_type?.name ?? null
                } : null,
                templateType: template.point_template_type?.name ?? null,
                pointGroup: template.point_group ? {
                    id: template.point_group.id,
                    name: template.point_group.name,
                    color: template.point_group.color
                } : null
            }
        })
    }
}