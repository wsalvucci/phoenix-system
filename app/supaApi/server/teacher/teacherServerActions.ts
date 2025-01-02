"use server";

import { ClassConfigurationData, ImportedScorebook, NewScorebookData, NewScorebookPointEvent, RankingGroup, RankingGroupData, RankingGroupScorebookData, ScorebookData, ScorebookPointEvent } from "@/app/dataClasses";
import supabaseServiceClient from "../supabaseServiceClient";
import { checkTeacherAccessToStudentGroup } from "./studentGroups/checkTeacherAccessToStudentGroup";
import { Database } from "@/types/supabase";
import getOwnTeacherData from "./getOwnTeacherData";
import { DateTime } from "luxon";

export async function createPointEvent(
        studentGroupId: number,
        pointTemplateId: number,
        date: string,
        name: string,
        maxInput: number,
): Promise<boolean> {
        const teacherAccess = await checkTeacherAccessToStudentGroup(studentGroupId);

        if (!teacherAccess) return false;

        const supabase = await supabaseServiceClient();

        const { data: pointEventData, error: pointEventError } = await supabase.from("point_event").insert({
                student_group_id: studentGroupId,
                template_id: pointTemplateId,
                date: date,
                name: name,
                max_input: maxInput
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

        const newStudentPoints: {
                student_id: number;
                point_event_id: number;
                point_value: number;
        }[] = studentGroupPairsData.map((studentPair) => {
                if (studentPair.student === null) return null;
                return {
                        student_id: studentPair.student.id,
                        point_event_id: pointEventData.id,
                        point_value: 0
                }
        }).filter((studentPoint) => studentPoint !== null);

        const { data: studentPointsData, error: studentPointsError } = await supabase.from("student_point").upsert(newStudentPoints)

        if (studentPointsError) {
                console.error("Error creating student points", studentPointsError);
                return false;
        }

        return true;
}

export async function checkTeacherAccessToPointEvent(pointEventId: number): Promise<boolean> {
        const teacherData = await getOwnTeacherData();

        if (!teacherData) return false;

        const supabase = await supabaseServiceClient();

        const { data: pointEventData, error: pointEventError } = await supabase.from("point_event").select("*").eq("id", pointEventId).single();

        if (pointEventError) {
                console.error("Error fetching point event", pointEventError);
                return false;
        }

        if (!pointEventData) {
                console.error("Point event not found");
                return false;
        }

        const { data: teacherGroupPairData, error: teacherGroupPairError } = await supabase.from("teacher_student_group_pair").select("*").eq("teacher_id", teacherData.id).eq("group_id", pointEventData.student_group_id).single();

        if (teacherGroupPairError) {
                console.error(teacherGroupPairError);
                return false;
        }

        if (teacherGroupPairData === null) return false;

        return true;
}

export async function deletePointEvent(pointEventId: number): Promise<boolean> {
        console.log("Deleting point event", pointEventId);
        const teacherAccess = await checkTeacherAccessToPointEvent(pointEventId);
        console.log(teacherAccess);
        if (!teacherAccess) return false;

        const supabase = await supabaseServiceClient();

        const { data: pointEventData, error: pointEventError } = await supabase.from("point_event").delete().eq("id", pointEventId).single();

        if (pointEventError) {
                console.error("Error deleting point event", pointEventError);
                return false;
        }

        return true;
}

export async function newGetScorebookData(studentGroupId: number): Promise<NewScorebookData> {
        const teacherAccess = await checkTeacherAccessToStudentGroup(studentGroupId);

        if (!teacherAccess) throw new Error("Teacher does not have access to this student group");

        const supabase = await supabaseServiceClient();

        const {
                data: studentGroupData,
                error: studentGroupDataError
        } = await supabase.from("student_group").select("*, student(*)").eq("id", studentGroupId).single()

        if (studentGroupDataError) throw new Error(studentGroupDataError.message)
        if (studentGroupData == null) throw new Error("No student group data")

        const {
                data: pointTemplateData,
                error: pointTemplateDataError
        } = await supabase.from("point_template").select("*").eq("student_group_id", studentGroupId)

        if (pointTemplateDataError) throw new Error(pointTemplateDataError.message)
        if (pointTemplateData == null) throw new Error("No point template data")

        const {
                data: pointEventData,
                error: pointEventDataError
        } = await supabase.from("point_event").select("*, point_template (*, point_conversion_rule_type (*), point_group (*)), student_point (*, student (id, powerschool_id, student_group (*)))").eq("student_group_id", studentGroupId)

        if (pointEventDataError) throw new Error(pointEventDataError.message)
        if (pointEventData == null) throw new Error("No point event data")

        if (studentGroupData.school_id == null) throw new Error("Unattached student group (no school id)")
        const {
                data: pointGroupsData,
                error: pointGroupsDataError
        } = await supabase.from("point_group").select("*").eq("school_id", studentGroupData.school_id)

        if (pointGroupsDataError) throw new Error(pointGroupsDataError.message)
        if (pointGroupsData == null) throw new Error("No point groups data")

        console.log(pointEventData.map((pointEvent) => pointEvent.name))

        return {
                pointTemplates: pointTemplateData.map((pointTemplate) => {
                        return {
                                id: pointTemplate.id,
                                name: pointTemplate.name
                        }
                }),
                pointEvents: pointEventData.map((pointEvent) => {
                        if (pointEvent.point_template == null) return
                        if (pointEvent.point_template.point_group == null) return

                        return {
                                id: pointEvent.id,
                                date: pointEvent.date ?? "0",
                                name: pointEvent.name ?? "",
                                maxInput: pointEvent.max_input,
                                template: {
                                        id: pointEvent.point_template.id,
                                        name: pointEvent.point_template.name,
                                        conversionRuleType: pointEvent.point_template.point_conversion_rule_type?.name ?? "default",
                                        conversionRuleValue: pointEvent.point_template.conversion_rule_value ?? 0,
                                        conversionRuleTarget: pointEvent.point_template.max_input_value ?? 0,
                                        pointGroup: {
                                                id: pointEvent.point_template.point_group.id,
                                                name: pointEvent.point_template.point_group.name,
                                                color: pointEvent.point_template.point_group.color
                                        }
                                },
                                studentPoints: pointEvent.student_point.map((studentPoint) => {
                                        if (studentPoint.student == null) return
                                        return {
                                                student: {
                                                        id: studentPoint.student.id,
                                                        studentGroups: studentPoint.student.student_group.map((studentGroup) => {
                                                                return {
                                                                        id: studentGroup.id,
                                                                        name: studentGroup.name
                                                                }
                                                        }),
                                                        powerschoolId: studentPoint.student.powerschool_id
                                                },
                                                pointData: {
                                                        //id: studentPoint.id,
                                                        input: studentPoint.input_score ?? 0,
                                                        value: studentPoint.point_value,
                                                        notes: studentPoint.notes ?? ""
                                                }
                                        }
                                }).filter((studentPoint) => studentPoint !== undefined)
                        }
                })
                        .filter((pointEvent) => pointEvent !== undefined)
                        .sort((a, b) => DateTime.fromISO(a.date).toSeconds() - DateTime.fromISO(b.date).toSeconds()),
                students: studentGroupData.student.map((student) => {
                        return {
                                id: student.id,
                                firstName: student.first_name,
                                lastName: student.last_name
                        }
                }),
                studentGroup: {
                        id: studentGroupData.id,
                        name: studentGroupData.name
                },
                pointGroups: pointGroupsData.map((pointGroup) => {
                        return {
                                id: pointGroup.id,
                                name: pointGroup.name,
                                color: pointGroup.color
                        }
                })
        }
}

export async function getScorebookData(studentGroupId: number): Promise<ScorebookData> {
        const teacherAccess = await checkTeacherAccessToStudentGroup(studentGroupId);

        if (!teacherAccess) throw new Error("Teacher does not have access to this student group");

        const supabase = await supabaseServiceClient();

        const pointEventsResponse = await supabase.from("point_event").select("*, point_template (*, point_conversion_rule_type (*), point_group (*)), student_point (*)").eq("student_group_id", studentGroupId);
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

        return {
                pointEvents: pointEventsResponse.data.map((pointEventData) => ({
                        id: pointEventData.id,
                        date: pointEventData.date,
                        name: pointEventData.name,
                        student_group_id: pointEventData.student_group_id,
                        template_id: pointEventData.template_id,
                        maxInput: pointEventData.max_input,
                        linkedTemplateData: {
                                id: pointEventData.point_template?.id,
                                name: pointEventData.point_template?.name,
                                conversionRuleType: pointEventData.point_template?.point_conversion_rule_type ?? null,
                                pointGroup: pointEventData.point_template?.point_group ?? null,
                                conversionRuleValue: pointEventData.point_template?.conversion_rule_value ?? null,
                                conversionRuleTarget: pointEventData.point_template?.max_input_value ?? null,
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

export async function editPointEvent(scorebookPointEvent: NewScorebookPointEvent, studentGroupId: number): Promise<boolean> {
        console.log(scorebookPointEvent.studentPoints.map((studentPoint) => studentPoint.student.id + " " + studentPoint.pointData.input + " : " + studentPoint.pointData.value))
        const teacherAccess = await checkTeacherAccessToStudentGroup(studentGroupId);

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

        if (currentPointEventData.student_group_id !== studentGroupId) {
                console.error("Teacher does not have access to this point event");
                return false;
        }

        const { data, error } = await supabase.from("point_event").upsert({
                id: scorebookPointEvent.id,
                date: scorebookPointEvent.date,
                name: scorebookPointEvent.name,
                max_input: scorebookPointEvent.maxInput ?? 0,
                student_group_id: studentGroupId,
                template_id: scorebookPointEvent.template.id
        });

        if (error) {
                console.error("Error editing point event", error);
                return false;
        }

        const newStudentPoints = scorebookPointEvent.studentPoints?.map((studentPoint) => {
                return {
                        //id: studentPoint.pointData.id,
                        student_id: studentPoint.student.id,
                        point_value: studentPoint.pointData.value,
                        point_event_id: scorebookPointEvent.id,
                        input_score: studentPoint.pointData.input
                }
        })

        if (!newStudentPoints) return true;

        console.log(newStudentPoints)

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

        const { data: studentGroupData, error: studentGroupError } = await supabase.from("student_group").select("*").eq("id", studentGroupId).single();

        if (studentGroupError) {
                console.error("Error fetching student group", studentGroupError);
                throw new Error("Error fetching student group");
        }

        const { data: templateData, error: templateDataError } = await supabase.from("point_template").select("*, point_conversion_rule_type (*), point_template_type (*), point_group (*)").eq("student_group_id", studentGroupId);

        if (templateDataError) {
                console.error("Error fetching point templates", templateDataError);
                throw new Error("Error fetching point templates");
        }

        const { data: pointGroupsData, error: pointGroupsError } = await supabase.from("point_group").select("*").eq("school_id", studentGroupData.school_id ?? -1);

        if (pointGroupsError) {
                console.error("Error fetching point groups", pointGroupsError);
                throw new Error("Error fetching point groups");
        }

        const { data: pointTemplateTypesData, error: pointTemplateTypesError } = await supabase.from("point_template_type").select("*");

        if (pointTemplateTypesError) {
                console.error("Error fetching point template types", pointTemplateTypesError);
                throw new Error("Error fetching point template types");
        }

        const { data: pointConversionRulesData, error: pointConversionRulesError } = await supabase.from("point_conversion_rule").select("*, ruleType: point_conversion_rule_type (*)");

        if (pointConversionRulesError) {
                console.error("Error fetching point conversion rules", pointConversionRulesError);
                throw new Error("Error fetching point conversion rules");
        }

        const { data: pointConversionRuleTypesData, error: pointConversionRuleTypesError } = await supabase.from("point_conversion_rule_type").select("*");

        if (pointConversionRuleTypesError) {
                console.error("Error fetching point conversion rule types", pointConversionRuleTypesError);
                throw new Error("Error fetching point conversion rule types");
        }

        return {
                templates: templateData.map((template) => {
                        return {
                                id: template.id,
                                name: template.name,
                                templateType: template.point_template_type?.name ?? null,
                                pointGroup: template.point_group ? {
                                        id: template.point_group.id,
                                        name: template.point_group.name,
                                        color: template.point_group.color
                                } : null,
                                conversionRuleType: template.point_conversion_rule_type?.name ?? null,
                                conversionRuleValue: template.conversion_rule_value ?? 0,
                                conversionRuleTarget: template.max_input_value ?? 0,
                                conversionRuleFormula: template.conversion_formula ?? null
                        }
                }),
                pointGroups: pointGroupsData,
                templateTypes: pointTemplateTypesData,
                conversionRuleTypes: pointConversionRuleTypesData
        }
}

export async function createPointTemplate(
        studentGroupId: number,
        name: string,
        pointGroupId: number,
        typeId: number,
        conversionRuleTypeId: number,
        conversionRuleValue: number,
        maxInputValue: number,
): Promise<boolean> {
        const teacherAccess = await checkTeacherAccessToStudentGroup(studentGroupId);

        if (!teacherAccess) return false;

        const supabase = await supabaseServiceClient();

        const { data, error } = await supabase.from("point_template").insert({
                name: name,
                template_type_id: typeId,
                point_group_id: pointGroupId,
                student_group_id: studentGroupId,
                conversion_rule_type: conversionRuleTypeId,
                conversion_rule_value: conversionRuleValue,
                max_input_value: maxInputValue
        });

        if (error) {
                console.error("Error creating point template", error);
                return false;
        }

        return true;
}

export async function createConversionRule(
        studentGroupId: number,
        name: string,
        value: number,
        formula: string | null,
        conversionRuleTypeId: number,
        target: number
): Promise<boolean> {
        const teacherAccess = await checkTeacherAccessToStudentGroup(studentGroupId);

        if (!teacherAccess) return false;

        const supabase = await supabaseServiceClient();

        const { data, error } = await supabase.from("point_conversion_rule").insert({
                name: name,
                value: value,
                formula: formula,
                conversion_rule_type_id: conversionRuleTypeId,
                target: target
        });

        if (error) {
                console.error("Error creating conversion rule", error);
                return false;
        }

        return true;
}

export async function checkTeacherAccessToRankingGroup(rankingGroupId: number): Promise<boolean> {
        const teacherData = await getOwnTeacherData();

        if (!teacherData) return false;

        const supabase = await supabaseServiceClient();

        const { data: rankingGroupPairData, error: rankingGroupPairError } = await supabase.from("teacher_ranking_group_pair").select("*").eq("teacher_id", teacherData.id).eq("ranking_group_id", rankingGroupId).single();

        if (rankingGroupPairError) {
                console.error(rankingGroupPairError);
                return false;
        }

        if (rankingGroupPairData === null) return false;

        return true;
}

export async function getRankingGroups(): Promise<RankingGroupData[]> {
        const teacherData = await getOwnTeacherData();

        if (!teacherData) throw new Error("Teacher data not found");

        const supabase = await supabaseServiceClient();

        const { data, error } = await supabase.from("teacher_ranking_group_pair").select("*, ranking_group (*, ranking_group_pair (*, student_group (*)))").eq("teacher_id", teacherData.id);

        if (error) {
                console.error("Error fetching ranking groups", error);
                throw new Error("Error fetching ranking groups");
        }

        return data.map((rankingGroupPairData) => {
                return {
                        id: rankingGroupPairData.ranking_group_id,
                        name: rankingGroupPairData.ranking_group?.name ?? "",
                        studentGroups: rankingGroupPairData.ranking_group?.ranking_group_pair.map((studentGroupPairData) => {
                                return {
                                        id: studentGroupPairData.student_group_id,
                                        name: studentGroupPairData.student_group?.name ?? ""
                                }
                        }) ?? []
                }
        })
}

export async function getRankingGroupPoints(rankingGroupId: number): Promise<RankingGroupScorebookData> {
        const teacherAccess = await checkTeacherAccessToRankingGroup(rankingGroupId);

        if (!teacherAccess) throw new Error("Teacher does not have access to this ranking group");

        const supabase = await supabaseServiceClient();

        const { data, error } = await supabase.from("ranking_group").select("*, ranking_group_pair(*, student_group (*)), ranking_group_point_event (*, student_group_point (*))").eq("id", rankingGroupId).single();

        if (error) {
                console.error("Error fetching ranking group points", error);
                throw new Error("Error fetching ranking group points");
        }

        return {
                id: data.id,
                name: data.name,
                studentGroups: data.ranking_group_pair.map((studentGroupPairData) => {
                        return {
                                id: studentGroupPairData.student_group_id,
                                name: studentGroupPairData.student_group?.name ?? "",
                        }
                }),
                pointEvents: data.ranking_group_point_event.map((pointEventData) => {
                        return {
                                id: pointEventData.id,
                                name: pointEventData.name ?? "",
                                date: pointEventData.date,
                                studentGroupPoints: pointEventData.student_group_point.map((studentGroupPointData) => {
                                        return {
                                                studentGroupId: studentGroupPointData.student_group_id,
                                                value: studentGroupPointData.value,
                                                pointId: studentGroupPointData.id
                                        }
                                })
                        }
                }
                )
        }
}

export async function createRankingGroupPointEvent(rankingGroupId: number, name: string, date: string): Promise<boolean> {
        const teacherAccess = await checkTeacherAccessToRankingGroup(rankingGroupId);

        if (!teacherAccess) return false;

        const supabase = await supabaseServiceClient();

        const { data, error } = await supabase.from("ranking_group_point_event").insert({
                ranking_group_id: rankingGroupId,
                name: name,
                date: date
        });

        if (error) {
                console.error("Error creating ranking group point event", error);
                return false;
        }

        return true;
}

export async function editRankingGroupPointEvent(
        rankingGroupId: number,
        pointEventId: number,
        name: string,
        date: string,
        points: {
                studentGroupId: number;
                pointId: number;
                value: number;
        }[]
): Promise<boolean> {
        const teacherAccess = await checkTeacherAccessToRankingGroup(rankingGroupId);

        if (!teacherAccess) return false;

        const supabase = await supabaseServiceClient();

        const { data, error } = await supabase.from("ranking_group_point_event").select("*").eq("id", pointEventId).single();

        if (error) {
                console.error("Error fetching ranking group point event", error);
                return false;
        }

        if (!data) {
                console.error("Point event not found");
                return false;
        }

        if (data.ranking_group_id !== rankingGroupId) {
                console.error("Teacher does not have access to this point event");
                return false;
        }

        const { data: updateData, error: updateError } = await supabase.from("ranking_group_point_event").update({
                name: name,
                date: date
        }).eq("id", pointEventId);

        if (updateError) {
                console.error("Error updating ranking group point event", updateError);
                return false;
        }

        const newPoints = points.map((point) => {
                if (point.pointId === -1) {
                        return {
                                student_group_id: point.studentGroupId,
                                value: point.value,
                                ranking_group_point_event_id: pointEventId
                        }
                } else {
                        return {
                                id: point.pointId,
                                student_group_id: point.studentGroupId,
                                value: point.value,
                                ranking_group_point_event_id: pointEventId
                        }
                }
        })

        console.log(newPoints);

        const { data: updateStudentGroupPointsData, error: updateStudentGroupPointsError } = await supabase.from("student_group_point").upsert(
                newPoints
        );

        if (updateStudentGroupPointsError) {
                console.error("Error updating student group points", updateStudentGroupPointsError);
                return false;
        }

        return true;
}

export default async function importPhoenixScorebookData(
        studentGroupId: number,
        data: ImportedScorebook
): Promise<string | void> {
        const teacherAccess = await checkTeacherAccessToStudentGroup(studentGroupId);

        if (!teacherAccess) return "Teacher not assigned to group";

        const supabase = await supabaseServiceClient();

        data.map(async (pointEvent) => {
                await supabase.from('student_point')
                        .upsert(pointEvent.studentPoints.map((student) => {
                                return {
                                        created_at: DateTime.now().toISO(),
                                        point_value: student.value,
                                        student_id: student.id,
                                        input_score: student.input,
                                        notes: null,
                                        point_event_id: pointEvent.pointEventId
                                }
                        }))
        })

        return
}
