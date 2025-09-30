"use server";

import supabaseServiceClient from "../supabaseServiceClient";
import { NewScorebookData, NewScorebookPointEvent, ClassConfigurationData, RankingGroupData, RankingGroupScorebookData, ImportedScorebook, TeacherTimeframe } from "@/types/domain";
import { DateTime } from "luxon";
import { checkTeacherAccessToStudentGroup } from "./studentGroups/checkTeacherAccessToStudentGroup";
import { createClient } from "@/utils/supabase/server";

export async function createPointEvent(
        studentGroupId: number,
        pointGroupId: number,
        date: string,
        name: string,
        maxInput: number,
): Promise<boolean> {
        const teacherAccess = await checkTeacherAccessToStudentGroup(studentGroupId);

        if (!teacherAccess) return false;

        const supabase = await supabaseServiceClient();

        // Use the dummy template ID 38 since we plan to eliminate the template system
        const templateId = 38;

        const { data: pointEventData, error: pointEventError } = await supabase.from("point_event").insert({
                student_group_id: studentGroupId,
                template_id: templateId,
                point_group_id: pointGroupId,
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
        const supabase = await supabaseServiceClient();
        const authClient = createClient();

        // Get current user
        const { data: { user: supabaseUser }, error: authError } = await authClient.auth.getUser();
        
        if (authError || !supabaseUser) {
                console.error("User not authenticated", authError);
                return false;
        }

        // Get numeric user ID from user table
        const { data: userRow, error: userError } = await supabase
                .from("user")
                .select("id")
                .eq("supabase_id", supabaseUser.id)
                .single();
        if (userError || !userRow) {
                console.error("Could not find user row for supabase_id", supabaseUser.id, userError);
                return false;
        }
        const numericUserId = userRow.id;

        // Get all teacher records for this user
        const { data: teacherData, error: teacherError } = await supabase
                .from("teacher")
                .select("id")
                .eq("linked_user", numericUserId);

        if (teacherError) {
                console.error("Error getting teacher data", teacherError);
                return false;
        }

        if (!teacherData || teacherData.length === 0) {
                console.error("No teacher records found for user");
                return false;
        }

        // Get the point event to find its student group
        const { data: pointEventData, error: pointEventError } = await supabase
                .from("point_event")
                .select("*")
                .eq("id", pointEventId)
                .single();

        if (pointEventError) {
                console.error("Error fetching point event", pointEventError);
                return false;
        }

        if (!pointEventData) {
                console.error("Point event not found");
                return false;
        }

        // Get all teacher IDs
        const teacherIds = teacherData.map(teacher => teacher.id);

        // Check if any of the teacher records have access to this student group
        const { data: teacherGroupPairData, error: teacherGroupPairError } = await supabase
                .from("teacher_student_group_pair")
                .select("*")
                .in("teacher_id", teacherIds)
                .eq("group_id", pointEventData.student_group_id)
                .limit(1);

        if (teacherGroupPairError) {
                console.error("Error getting teacher student group pairing", teacherGroupPairError);
                return false;
        }

        if (!teacherGroupPairData || teacherGroupPairData.length === 0) {
                console.error("Teacher does not have access to this point event", {
                        teacherIds,
                        pointEventId,
                        studentGroupId: pointEventData.student_group_id
                });
                return false;
        }

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

export async function newGetScorebookData(studentGroupId: number, timeframeId?: number | null): Promise<NewScorebookData> {
    const supabase = await supabaseServiceClient();
    const authClient = createClient();

    // Determine who is accessing: teacher and/or teaching assistant
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData?.user) {
        throw new Error("Not authenticated");
    }

    const { data: userRow, error: userError } = await supabase
        .from("user")
        .select("id")
        .eq("supabase_id", authData.user.id)
        .single();
    if (userError || !userRow) throw new Error("User not found");

    // Check teacher access
    let hasTeacherAccess = await checkTeacherAccessToStudentGroup(studentGroupId);

    // Check teaching assistant access and scope (support users who are both teacher and student)
    let accessiblePointEventIds: number[] | null = null;
    if (!hasTeacherAccess) {
        // Find all student records linked to this user
        const { data: linkedStudents } = await supabase
            .from("student")
            .select("id")
            .eq("linkedUser", userRow.id);

        const studentIds: number[] = Array.isArray(linkedStudents) ? linkedStudents.map(s => s.id) : [];
        if (studentIds.length === 0) {
            throw new Error("Access denied to this student group");
        }

        // Find any TA rows for this group across linked students
        const { data: assistants } = await supabase
            .from("teaching_assistant")
            .select("id, full_access, student_id")
            .eq("group_id", studentGroupId)
            .in("student_id", studentIds);

        if (!assistants || assistants.length === 0) {
            throw new Error("Access denied to this student group");
        }

        // If any assistant has full access, grant all events
        if (assistants.some(a => a.full_access)) {
            accessiblePointEventIds = null;
        } else {
            // Union allowed events across assistant records
            const assistantIds = assistants.map(a => a.id);
            const { data: pointEventAccessData } = await supabase
                .from("teaching_assistant_point_event")
                .select("point_event_id, assistant_id")
                .in("assistant_id", assistantIds);
            accessiblePointEventIds = Array.from(new Set((pointEventAccessData || []).map(r => r.point_event_id)));
        }
    }

    const { data: studentGroupData, error: studentGroupDataError } = await supabase
        .from("student_group")
        .select("*, student(*)")
        .eq("id", studentGroupId)
        .single();
    if (studentGroupDataError) throw new Error(studentGroupDataError.message);
    if (studentGroupData == null) throw new Error("No student group data");

    // Build point event query with optional timeframe filtering
    let pointEventQuery = supabase
        .from("point_event")
        .select("*, point_group (*), student_point (*, student (id, first_name, last_name, powerschool_id, student_group (*)))")
        .eq("student_group_id", studentGroupId);

    // Add timeframe filtering if timeframeId is provided
    if (timeframeId !== null && timeframeId !== undefined) {
        // Get the timeframe dates
        const { data: timeframeData, error: timeframeError } = await supabase
            .from("school_timeframes")
            .select("starts_at, ends_at")
            .eq("id", timeframeId)
            .single();
        
        if (!timeframeError && timeframeData) {
            pointEventQuery = pointEventQuery
                .gte("date", timeframeData.starts_at)
                .lte("date", timeframeData.ends_at);
        }
    }
    
    // Filter by accessible point events if user is a teaching assistant with limited access
    if (accessiblePointEventIds !== null) {
        // If assistant has limited list and it's empty, return no events
        if (accessiblePointEventIds.length === 0) {
            const empty: NewScorebookData = {
                pointEvents: [],
                students: [],
                studentGroup: { id: studentGroupId, name: studentGroupData.name },
                pointGroups: []
            };
            return empty;
        }
        pointEventQuery = pointEventQuery.in("id", accessiblePointEventIds);
    }
    
    const { data: pointEventData, error: pointEventDataError } = await pointEventQuery;
    if (pointEventDataError) throw new Error(pointEventDataError.message);
    if (pointEventData == null) throw new Error("No point event data");
    if (studentGroupData.school_id == null) throw new Error("Unattached student group (no school id)");
    const { data: pointGroupsData, error: pointGroupsDataError } = await supabase.from("point_group").select("*").eq("school_id", studentGroupData.school_id);
    if (pointGroupsDataError) throw new Error(pointGroupsDataError.message);
    if (pointGroupsData == null) throw new Error("No point groups data");
    
    return {
        pointEvents: pointEventData.map((pe: any) => {
            if (pe.point_group == null) return null;
            return {
                id: pe.id,
                date: pe.date ?? "0",
                name: pe.name ?? "",
                maxInput: pe.max_input,
                pointGroup: {
                    id: pe.point_group.id,
                    name: pe.point_group.name,
                    color: pe.point_group.color
                },
                studentPoints: Array.isArray(pe.student_point) ? pe.student_point.map((sp: any) => {
                    if (sp.student == null) return null;
                    return {
                        student: {
                            id: sp.student.id,
                            studentGroups: Array.isArray(sp.student.student_group) ? sp.student.student_group.map((sg: any) => ({
                                id: sg.id,
                                name: sg.name
                            })) : [],
                            powerschoolId: sp.student.powerschool_id
                        },
                        pointData: {
                            input: sp.point_value, // Use point_value as input since input_score is no longer used
                            value: sp.point_value,
                            notes: sp.notes ?? ""
                        }
                    };
                }).filter((sp: any) => sp !== null) : []
            };
        }).filter((pe: any) => pe !== null).sort((a: any, b: any) => DateTime.fromISO(a.date).toSeconds() - DateTime.fromISO(b.date).toSeconds()) as NewScorebookPointEvent[],
        students: Array.isArray(studentGroupData.student) ? studentGroupData.student.filter((student: any) => student !== null).map((student: any) => ({
            id: student.id,
            firstName: student.first_name?.trim() ?? "",
            lastName: student.last_name?.trim() ?? ""
        })) : [],
        studentGroup: {
            id: studentGroupData.id,
            name: studentGroupData.name
        },
        pointGroups: pointGroupsData ? pointGroupsData.map((pg: any) => ({
            id: pg.id,
            name: pg.name,
            color: pg.color
        })) : []
    };
}

export async function updateStudentPointsByAssistant(
    studentGroupId: number,
    pointEventId: number,
    updates: { studentId: number; input: number; value: number; notes: string }[],
): Promise<boolean> {
    const supabase = await supabaseServiceClient();
    const authClient = createClient();

    // Auth and user lookup
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData?.user) {
        console.error("User not authenticated", authError);
        return false;
    }

    const { data: userRow, error: userError } = await supabase
        .from("user")
        .select("id")
        .eq("supabase_id", authData.user.id)
        .single();
    if (userError || !userRow) {
        console.error("Could not find user row for supabase_id", authData.user.id, userError);
        return false;
    }

    // Verify point event belongs to the group
    const { data: pointEvent, error: peError } = await supabase
        .from("point_event")
        .select("id, student_group_id")
        .eq("id", pointEventId)
        .single();
    if (peError || !pointEvent || pointEvent.student_group_id !== studentGroupId) {
        console.error("Point event not found or does not belong to group", { pointEventId, studentGroupId });
        return false;
    }

    // Check teacher access first (teachers always allowed)
    const isTeacher = await checkTeacherAccessToStudentGroup(studentGroupId);
    let allowed = isTeacher;

    // If not teacher, check assistant access
    if (!allowed) {
        // Find student records for this user
        const { data: linkedStudents } = await supabase
            .from("student")
            .select("id")
            .eq("linkedUser", userRow.id);
        const studentIds: number[] = Array.isArray(linkedStudents) ? linkedStudents.map(s => s.id) : [];
        if (studentIds.length === 0) {
            console.error("No assistant access to group (no linked students)");
            return false;
        }

        // Find TA rows
        const { data: assistants } = await supabase
            .from("teaching_assistant")
            .select("id, full_access")
            .eq("group_id", studentGroupId)
            .in("student_id", studentIds);
        if (!assistants || assistants.length === 0) {
            console.error("No assistant access to group");
            return false;
        }

        // If any assistant has full access, allow
        if (assistants.some(a => a.full_access)) {
            allowed = true;
        } else {
            const assistantIds = assistants.map(a => a.id);
            const { data: accessRows } = await supabase
                .from("teaching_assistant_point_event")
                .select("point_event_id")
                .in("assistant_id", assistantIds)
                .eq("point_event_id", pointEventId);
            if (!accessRows || accessRows.length === 0) {
                console.error("Assistant does not have access to this event");
                return false;
            }
            allowed = true;
        }
    }

    if (!allowed) return false;

    // Upsert student points
    const rows = updates.map((u) => ({
        student_id: u.studentId,
        point_event_id: pointEventId,
        input_score: u.input,
        point_value: u.value,
        notes: u.notes ?? null,
    }));

    const { error: upsertError } = await supabase.from("student_point").upsert(rows);
    if (upsertError) {
        console.error("Error updating student points as assistant", upsertError);
        return false;
    }
    return true;
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
                template_id: 38, // Use dummy template ID 38
                point_group_id: scorebookPointEvent.pointGroup.id
        });

        if (error) {
                console.error("Error editing point event", error);
                return false;
        }

        // Update student points
        const studentPointsToUpdate = scorebookPointEvent.studentPoints.map((studentPoint) => ({
                student_id: studentPoint.student.id,
                point_event_id: scorebookPointEvent.id,
                point_value: studentPoint.pointData.value,
                input_score: studentPoint.pointData.input,
                notes: studentPoint.pointData.notes
        }));

        const { error: studentPointsError } = await supabase.from("student_point").upsert(studentPointsToUpdate);

        if (studentPointsError) {
                console.error("Error updating student points", studentPointsError);
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
        const supabase = await supabaseServiceClient();
        const authClient = createClient();

        // Get current user
        const { data: { user: supabaseUser }, error: authError } = await authClient.auth.getUser();
        
        if (authError || !supabaseUser) {
                console.error("User not authenticated", authError);
                return false;
        }

        // Get numeric user ID from user table
        const { data: userRow, error: userError } = await supabase
                .from("user")
                .select("id")
                .eq("supabase_id", supabaseUser.id)
                .single();
        if (userError || !userRow) {
                console.error("Could not find user row for supabase_id", supabaseUser.id, userError);
                return false;
        }
        const numericUserId = userRow.id;

        // Get all teacher records for this user
        const { data: teacherData, error: teacherError } = await supabase
                .from("teacher")
                .select("id")
                .eq("linked_user", numericUserId);

        if (teacherError) {
                console.error("Error getting teacher data", teacherError);
                return false;
        }

        if (!teacherData || teacherData.length === 0) {
                console.error("No teacher records found for user");
                return false;
        }

        // Get all teacher IDs
        const teacherIds = teacherData.map(teacher => teacher.id);

        // Check if any of the teacher records have access to this ranking group
        const { data: rankingGroupPairData, error: rankingGroupPairError } = await supabase
                .from("teacher_ranking_group_pair")
                .select("*")
                .in("teacher_id", teacherIds)
                .eq("ranking_group_id", rankingGroupId)
                .limit(1);

        if (rankingGroupPairError) {
                console.error("Error getting teacher ranking group pairing", rankingGroupPairError);
                return false;
        }

        if (!rankingGroupPairData || rankingGroupPairData.length === 0) {
                console.error("Teacher does not have access to this ranking group", {
                        teacherIds,
                        rankingGroupId
                });
                return false;
        }

        return true;
}

export async function getRankingGroups(): Promise<RankingGroupData[]> {
        const supabase = await supabaseServiceClient();
        const authClient = createClient();

        // Get current user
        const { data: { user: supabaseUser }, error: authError } = await authClient.auth.getUser();
        
        if (authError || !supabaseUser) {
                console.error("User not authenticated", authError);
                throw new Error("User not authenticated");
        }

        // Get numeric user ID from user table
        const { data: userRow, error: userError } = await supabase
                .from("user")
                .select("id")
                .eq("supabase_id", supabaseUser.id)
                .single();
        if (userError || !userRow) {
                console.error("Could not find user row for supabase_id", supabaseUser.id, userError);
                throw new Error("Could not find user row for supabase_id");
        }
        const numericUserId = userRow.id;

        // Get all teacher records for this user
        const { data: teacherData, error: teacherError } = await supabase
                .from("teacher")
                .select("id")
                .eq("linked_user", numericUserId);

        if (teacherError) {
                console.error("Error getting teacher data", teacherError);
                throw new Error("Error getting teacher data");
        }

        if (!teacherData || teacherData.length === 0) {
                console.error("No teacher records found for user");
                throw new Error("Teacher data not found");
        }

        // Get all teacher IDs
        const teacherIds = teacherData.map(teacher => teacher.id);

        // Get ranking groups for all teacher records
        const { data, error } = await supabase
                .from("teacher_ranking_group_pair")
                .select("*, ranking_group (*, ranking_group_pair (*, student_group (*)))")
                .in("teacher_id", teacherIds);

        if (error) {
                console.error("Error fetching ranking groups", error);
                throw new Error("Error fetching ranking groups");
        }

        // Deduplicate ranking groups by ID to avoid showing the same group multiple times
        const uniqueRankingGroups = new Map();
        data.forEach((rankingGroupPairData) => {
                const rankingGroupId = rankingGroupPairData.ranking_group_id;
                if (!uniqueRankingGroups.has(rankingGroupId)) {
                        uniqueRankingGroups.set(rankingGroupId, {
                                id: rankingGroupId,
                                name: rankingGroupPairData.ranking_group?.name ?? "",
                                studentGroups: rankingGroupPairData.ranking_group?.ranking_group_pair.map((studentGroupPairData) => {
                                        return {
                                                id: studentGroupPairData.student_group_id,
                                                name: studentGroupPairData.student_group?.name ?? ""
                                        }
                                }) ?? []
                        });
                }
        });

        return Array.from(uniqueRankingGroups.values());
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

export async function getTeacherSchoolTimeframes(studentGroupId: number): Promise<TeacherTimeframe[]> {
    const supabase = await supabaseServiceClient();
    const authClient = createClient();

    // Allow if current user is a teacher for the group OR a TA in the group
    let allowed = await checkTeacherAccessToStudentGroup(studentGroupId);

    if (!allowed) {
        const { data: authData } = await authClient.auth.getUser();
        if (authData?.user) {
            const { data: userRow } = await supabase
                .from("user")
                .select("id")
                .eq("supabase_id", authData.user.id)
                .single();
            if (userRow) {
                const { data: linkedStudents } = await supabase
                    .from("student")
                    .select("id")
                    .eq("linkedUser", userRow.id);
                const studentIds: number[] = Array.isArray(linkedStudents) ? linkedStudents.map(s => s.id) : [];
                if (studentIds.length > 0) {
                    const { data: assistants } = await supabase
                        .from("teaching_assistant")
                        .select("id")
                        .eq("group_id", studentGroupId)
                        .in("student_id", studentIds)
                        .limit(1);
                    if (assistants && assistants.length > 0) {
                        allowed = true;
                    }
                }
            }
        }
    }

    if (!allowed) throw new Error("Teacher does not have access to this student group");

    // Get the school_id for this student group
    const { data: studentGroupData, error: studentGroupError } = await supabase
        .from("student_group")
        .select("school_id")
        .eq("id", studentGroupId)
        .single();

    if (studentGroupError || !studentGroupData || !studentGroupData.school_id) {
        throw new Error("Student group not found or has no school");
    }

    // Get all timeframes for this school
    const { data: timeframes, error: timeframesError } = await supabase
        .from("school_timeframes")
        .select("id, name, starts_at, ends_at, active")
        .eq("school_id", studentGroupData.school_id)
        .order("starts_at", { ascending: false });

    if (timeframesError) {
        throw new Error("Failed to fetch timeframes");
    }

    return timeframes.map(timeframe => ({
        id: timeframe.id,
        name: timeframe.name,
        startsAt: timeframe.starts_at,
        endsAt: timeframe.ends_at,
        active: timeframe.active
    }));
}

export default async function importPhoenixScorebookData(
        studentGroupId: number,
        data: ImportedScorebook
): Promise<string | void> {
        const teacherAccess = await checkTeacherAccessToStudentGroup(studentGroupId);

        if (!teacherAccess) {
            return "Teacher not assigned to group";
        }

        const supabase = await supabaseServiceClient();

        // Check which students exist in the database
        const studentIds = data.flatMap(event => event.studentPoints.map(student => student.id));
        const uniqueStudentIds = [...new Set(studentIds)];

        const { data: existingStudents, error: studentCheckError } = await supabase
            .from('student')
            .select('id')
            .in('id', uniqueStudentIds);

        if (studentCheckError) {
            return "Error checking student existence";
        }

        const existingStudentIds = existingStudents?.map(s => s.id) || [];
        const missingStudentIds = uniqueStudentIds.filter(id => !existingStudentIds.includes(id));
        
        if (missingStudentIds.length > 0) {
            return `Students with IDs ${missingStudentIds.join(', ')} do not exist in the database`;
        }

        // For each event in the imported data
        for (const event of data) {
            const pointEventId = event.pointEventId;
            
            // For each student in this event
            for (const student of event.studentPoints) {
                // Skip if no score or empty
                if (student.input === undefined || student.input === null || String(student.input) === "") {
                    continue;
                }
                
                // Validate student ID before database operation
                if (!student.id || isNaN(student.id) || student.id <= 0) {
                    return `Invalid student ID: ${student.id}`;
                }
                
                const insertData = {
                    created_at: DateTime.now().toISO(),
                    point_value: student.value,
                    student_id: student.id,
                    input_score: student.input,
                    notes: null,
                    point_event_id: pointEventId
                };
                
                // Upsert the student point
                const { error: upsertError } = await supabase
                    .from('student_point')
                    .upsert(insertData);
                    
                if (upsertError) {
                    return `Error importing student point for student ${student.id}: ${upsertError.message}`;
                }
            }
        }
        
        return;
}
