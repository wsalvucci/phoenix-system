"use server";

import supabaseServiceClient from "../supabaseServiceClient";
import { NewScorebookData, NewScorebookPointEvent, ClassConfigurationData, RankingGroupData, RankingGroupScorebookData, ImportedScorebook, TeacherTimeframe, DuplicateScorebookEventsInput, DuplicateScorebookEventsResult } from "@/types/domain";
import { DateTime } from "luxon";
import { checkTeacherAccessToStudentGroup } from "./studentGroups/checkTeacherAccessToStudentGroup";
import { createClient } from "@/utils/supabase/server";
import { evaluatePointConversionFormula, validatePointConversionFormula } from "@/lib/pointConversionFormula";

export async function createPointEvent(
        studentGroupId: number,
        pointGroupId: number,
        date: string,
        name: string,
        maxInput: number,
        conversionFormula: string | null = null,
): Promise<boolean> {
        const teacherAccess = await checkTeacherAccessToStudentGroup(studentGroupId);

        if (!teacherAccess) return false;

        const supabase = await supabaseServiceClient();
        const formulaValidation = validatePointConversionFormula(conversionFormula);
        if (!formulaValidation.valid) throw new Error(formulaValidation.error);

        // Use the dummy template ID 38 since we plan to eliminate the template system
        const templateId = 38;

        const { data: pointEventData, error: pointEventError } = await supabase.from("point_event").insert({
                student_group_id: studentGroupId,
                template_id: templateId,
                point_group_id: pointGroupId,
                date: date,
                name: name,
                max_input: maxInput,
                conversion_formula: conversionFormula?.trim() || null
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

        const { data: studentPointsData, error: studentPointsError } = await supabase.from("student_point").upsert(newStudentPoints, {
                onConflict: 'student_id,point_event_id'
        })

        if (studentPointsError) {
                console.error("Error creating student points", studentPointsError);
                return false;
        }

        return true;
}

export async function duplicateScorebookEvents(
        input: DuplicateScorebookEventsInput,
): Promise<DuplicateScorebookEventsResult> {
        const teacherAccess = await checkTeacherAccessToStudentGroup(input.studentGroupId);
        if (!teacherAccess) throw new Error("Teacher does not have access to this student group");

        if (!Number.isInteger(input.shiftAmount) || input.shiftAmount < 1 || input.shiftAmount > 10000) {
                throw new Error("Shift amount must be a whole number between 1 and 10000");
        }
        if (!(["days", "months", "years"] as const).includes(input.shiftUnit)) {
                throw new Error("Invalid shift unit");
        }
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)) {
                throw new Error("Invalid request ID");
        }

        const supabase = await supabaseServiceClient();
        const authClient = createClient();
        const { data: authData, error: authError } = await authClient.auth.getUser();
        if (authError || !authData.user) throw new Error("Not authenticated");

        const { data: userRow, error: userError } = await supabase
                .from("user")
                .select("id")
                .eq("supabase_id", authData.user.id)
                .single();
        if (userError || !userRow) throw new Error("User not found");

        const { data: teacherRows, error: teacherError } = await supabase
                .from("teacher")
                .select("id")
                .eq("linked_user", userRow.id);
        if (teacherError || !teacherRows?.length) throw new Error("Teacher not found");

        const { data: accessPair, error: accessError } = await supabase
                .from("teacher_student_group_pair")
                .select("teacher_id")
                .eq("group_id", input.studentGroupId)
                .in("teacher_id", teacherRows.map(teacher => teacher.id))
                .limit(1)
                .single();
        if (accessError || !accessPair) throw new Error("Teacher does not have access to this student group");

        const excludedEventIds = Array.from(new Set(input.excludedEventIds));
        if (excludedEventIds.some(id => !Number.isInteger(id) || id < 1)) {
                throw new Error("Invalid excluded event ID");
        }
        const expectedSourceEventIds = Array.from(new Set(input.expectedSourceEventIds));
        if (!expectedSourceEventIds.length || expectedSourceEventIds.some(id => !Number.isInteger(id) || id < 1)) {
                throw new Error("Invalid source event snapshot");
        }

        const { data: sourceTimeframe, error: timeframeError } = await supabase
                .from("school_timeframes")
                .select("starts_at, ends_at")
                .eq("id", input.sourceTimeframeId)
                .single();
        if (timeframeError || !sourceTimeframe) throw new Error("Source timeframe was not found");

        const { data: liveSourceEvents, error: sourceEventsError } = await supabase
                .from("point_event")
                .select("id, point_group(id)")
                .eq("student_group_id", input.studentGroupId)
                .gte("date", sourceTimeframe.starts_at)
                .lte("date", sourceTimeframe.ends_at);
        if (sourceEventsError || !liveSourceEvents) throw new Error("Failed to verify source events");

        // The scorebook omits legacy events without a valid point group. Include those in the
        // database snapshot so the RPC sees the complete timeframe, but exempt them from copying.
        const visibleSourceEventIds = liveSourceEvents
                .filter(event => event.point_group !== null)
                .map(event => event.id)
                .sort((a, b) => a - b);
        const requestedSourceEventIds = [...expectedSourceEventIds].sort((a, b) => a - b);
        if (visibleSourceEventIds.length !== requestedSourceEventIds.length
                || visibleSourceEventIds.some((id, index) => id !== requestedSourceEventIds[index])) {
                throw new Error("The source timeframe changed after the duplication dialog was opened");
        }

        const hiddenSourceEventIds = liveSourceEvents
                .filter(event => event.point_group === null)
                .map(event => event.id);
        const allExcludedEventIds = Array.from(new Set([...excludedEventIds, ...hiddenSourceEventIds]));

        const { data, error } = await supabase.rpc("duplicate_scorebook_events", {
                provided_teacher_id: accessPair.teacher_id,
                provided_student_group_id: input.studentGroupId,
                provided_source_timeframe_id: input.sourceTimeframeId,
                provided_shift_amount: input.shiftAmount,
                provided_shift_unit: input.shiftUnit,
                provided_expected_source_event_ids: liveSourceEvents.map(event => event.id),
                // Omitted means the SQL default (null): no destination timeframe.
                provided_destination_timeframe_id: input.destinationTimeframeId ?? undefined,
                provided_excluded_event_ids: allExcludedEventIds,
                provided_request_id: input.requestId,
        });

        if (error) throw new Error(error.message);
        if (!data || typeof data !== "object" || Array.isArray(data)) {
                throw new Error("Unexpected duplication response");
        }

        return data as DuplicateScorebookEventsResult;
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
    const hasTeacherAccess = await checkTeacherAccessToStudentGroup(studentGroupId);

    // A student assistant is a peer (DATA_DISCLOSURE.md §10.7): names and the per-event
    // values for granted events only. No notes, no PowerSchool ids, no memberships in other groups.
    const viewerIsAssistant = !hasTeacherAccess;

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
        .select("*, student(id, first_name, last_name)")
        .eq("id", studentGroupId)
        .single();
    if (studentGroupDataError) throw new Error(studentGroupDataError.message);
    if (studentGroupData == null) throw new Error("No student group data");

    // Build point event query with optional timeframe filtering. The assistant query never
    // selects notes, PowerSchool ids, or other-group memberships, so they never leave the database.
    const studentPointSelect = viewerIsAssistant
        ? "student_point (id, student_id, input_score, point_value, student (id))"
        : "student_point (*, student (id, first_name, last_name, powerschool_id, student_group (*)))";
    let pointEventQuery = supabase
        .from("point_event")
        .select(`*, point_group (*), ${studentPointSelect}`)
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
                conversionFormula: pe.conversion_formula,
                pointGroup: {
                    id: pe.point_group.id,
                    name: pe.point_group.name,
                    color: pe.point_group.color
                },
                studentPoints: Array.isArray(pe.student_point) ? pe.student_point.map((sp: any) => {
                    if (sp.student == null) return null;
                    return {
                        student: viewerIsAssistant
                            ? { id: sp.student.id }
                            : {
                                id: sp.student.id,
                                studentGroups: Array.isArray(sp.student.student_group) ? sp.student.student_group.map((sg: any) => ({
                                    id: sg.id,
                                    name: sg.name
                                })) : [],
                                powerschoolId: sp.student.powerschool_id
                            },
                        pointData: {
                            input: sp.input_score ?? sp.point_value,
                            value: sp.point_value,
                            notes: viewerIsAssistant ? "" : (sp.notes ?? "")
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
        .select("id, student_group_id, conversion_formula")
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

    // Every target student must belong to this group. Reject the whole batch otherwise
    // (matches atomic_edit_point_event: "A student does not belong to this student group").
    const targetIds = Array.from(new Set(updates.map((u) => u.studentId)));
    if (targetIds.some((id) => !Number.isInteger(id))) {
        console.error("Invalid student id in assistant point update", { studentGroupId, pointEventId });
        return false;
    }
    if (targetIds.length > 0) {
        const { data: members, error: membersError } = await supabase
            .from("student_group_pair")
            .select("student_id")
            .eq("student_group_id", studentGroupId)
            .in("student_id", targetIds);
        if (membersError) {
            console.error("Error verifying student group membership", membersError);
            return false;
        }
        const memberIds = new Set((members ?? []).map((m) => m.student_id));
        if (targetIds.some((id) => !memberIds.has(id))) {
            console.error("A student does not belong to this student group", { studentGroupId, pointEventId, userId: userRow.id });
            return false;
        }
    }

    // Upsert student points. A student assistant never sees or writes notes (§10.7), so the
    // notes column is left out of their upsert and existing teacher notes are preserved.
    const rows = updates.map((u) => ({
        student_id: u.studentId,
        point_event_id: pointEventId,
        input_score: u.input,
        point_value: evaluatePointConversionFormula(pointEvent.conversion_formula, u.input),
        ...(isTeacher ? { notes: u.notes ?? null } : {}),
    }));

    const { error: upsertError } = await supabase.from("student_point").upsert(rows, {
        onConflict: 'student_id,point_event_id'
    });
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
        const formulaValidation = validatePointConversionFormula(scorebookPointEvent.conversionFormula);
        if (!formulaValidation.valid) throw new Error(formulaValidation.error);

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

        // Evaluate every score before starting the database transaction.
        const studentPointsToUpdate = scorebookPointEvent.studentPoints.map((studentPoint) => ({
                student_id: studentPoint.student.id,
                point_value: evaluatePointConversionFormula(scorebookPointEvent.conversionFormula, studentPoint.pointData.input),
                input_score: studentPoint.pointData.input,
                notes: studentPoint.pointData.notes
        }));

        const { error } = await supabase.rpc("edit_scorebook_point_event", {
                provided_point_event_id: scorebookPointEvent.id,
                provided_student_group_id: studentGroupId,
                provided_date: scorebookPointEvent.date,
                provided_name: scorebookPointEvent.name,
                provided_max_input: scorebookPointEvent.maxInput ?? 0,
                provided_conversion_formula: scorebookPointEvent.conversionFormula?.trim() || "",
                provided_point_group_id: scorebookPointEvent.pointGroup.id,
                provided_student_points: studentPointsToUpdate
        });

        if (error) {
                console.error("Error editing point event and student points", error);
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
        console.log(`[Import] Starting import for group ${studentGroupId} with ${data.length} events`);
        
        const teacherAccess = await checkTeacherAccessToStudentGroup(studentGroupId);

        if (!teacherAccess) {
            return "Teacher not assigned to group";
        }

        const supabase = await supabaseServiceClient();
        
        // Log payload size for debugging
        const payloadSize = JSON.stringify(data).length;
        console.log(`[Import] Payload size: ${(payloadSize / 1024).toFixed(2)} KB`);

        // Check which students exist in the database
        const studentIds = data.flatMap(event => event.studentPoints.map(student => student.id));
        const uniqueStudentIds = [...new Set(studentIds)];

        // Batch student existence check to avoid query size limits (Supabase typically limits .in() to ~1000 items)
        const BATCH_SIZE = 500;
        const existingStudentIds: number[] = [];
        
        for (let i = 0; i < uniqueStudentIds.length; i += BATCH_SIZE) {
            const batch = uniqueStudentIds.slice(i, i + BATCH_SIZE);
            const { data: batchStudents, error: studentCheckError } = await supabase
                .from('student')
                .select('id')
                .in('id', batch);

            if (studentCheckError) {
                console.error('Error checking student existence:', studentCheckError);
                return "Error checking student existence";
            }

            if (batchStudents) {
                existingStudentIds.push(...batchStudents.map(s => s.id));
            }
        }

        const missingStudentIds = uniqueStudentIds.filter(id => !existingStudentIds.includes(id));
        
        if (missingStudentIds.length > 0) {
            return `Students with IDs ${missingStudentIds.join(', ')} do not exist in the database`;
        }

        // Fetch existing student points for change detection
        // Filter out invalid pointEventIds (NaN, undefined, null, non-positive numbers)
        const invalidEventIds: Array<{ id: any; name: string }> = [];
        const validPointEventIds = data
            .map(event => {
                const eventId = event.pointEventId;
                // Check if eventId is valid
                if (eventId === undefined || eventId === null || isNaN(eventId) || eventId <= 0 || !Number.isInteger(eventId)) {
                    invalidEventIds.push({
                        id: eventId,
                        name: event.name || 'Unknown event'
                    });
                    return null;
                }
                return eventId;
            })
            .filter((id): id is number => id !== null);
        
        // Detect duplicate event IDs
        const eventIdToEvents = new Map<number, Array<{ name: string; index: number }>>();
        data.forEach((event, index) => {
            const eventId = event.pointEventId;
            if (eventId !== undefined && eventId !== null && !isNaN(eventId) && eventId > 0 && Number.isInteger(eventId)) {
                if (!eventIdToEvents.has(eventId)) {
                    eventIdToEvents.set(eventId, []);
                }
                eventIdToEvents.get(eventId)!.push({
                    name: event.name || 'Unknown event',
                    index: index + 1 // 1-indexed for user display
                });
            }
        });
        
        const duplicateEvents: Array<{ eventId: number; events: Array<{ name: string; index: number }> }> = [];
        eventIdToEvents.forEach((events, eventId) => {
            if (events.length > 1) {
                duplicateEvents.push({ eventId, events });
            }
        });
        
        // Report invalid event IDs if any were found
        if (invalidEventIds.length > 0) {
            const invalidDetails = invalidEventIds
                .map(e => `"${e.name}" (ID: ${e.id})`)
                .join(', ');
            return `Invalid point event IDs detected: ${invalidDetails}. Please check your import data.`;
        }
        
        // Report duplicate event IDs if any were found
        if (duplicateEvents.length > 0) {
            const duplicateDetails = duplicateEvents.map(dup => {
                const eventDetails = dup.events.map(e => `position ${e.index} ("${e.name}")`).join(', ');
                return `Event ID ${dup.eventId} appears ${dup.events.length} times: ${eventDetails}`;
            }).join('; ');
            return `Duplicate point event IDs detected: ${duplicateDetails}. Each event ID should appear only once. Please check your import data.`;
        }
        
        // Check if we have any valid event IDs to query
        if (validPointEventIds.length === 0) {
            return "No valid point event IDs found in import data. All event IDs are invalid or missing.";
        }
        
        // Verify that all point event IDs exist in the database
        // This prevents foreign key constraint violations
        const EVENT_BATCH_SIZE = 500;
        const existingPointEventIds: number[] = [];
        
        for (let i = 0; i < validPointEventIds.length; i += EVENT_BATCH_SIZE) {
            const eventBatch = validPointEventIds.slice(i, i + EVENT_BATCH_SIZE);
            const { data: batchPointEvents, error: pointEventCheckError } = await supabase
                .from('point_event')
                .select('id')
                .in('id', eventBatch);
                
            if (pointEventCheckError) {
                console.error('Error checking point event existence:', pointEventCheckError);
                return "Error checking point event existence";
            }
            
            if (batchPointEvents) {
                existingPointEventIds.push(...batchPointEvents.map(e => e.id));
            }
        }
        
        const missingPointEventIds = validPointEventIds.filter(id => !existingPointEventIds.includes(id));
        
        if (missingPointEventIds.length > 0) {
            // Find the event names for missing IDs to provide better warning message
            const missingEventDetails = data
                .filter(event => missingPointEventIds.includes(event.pointEventId))
                .map(event => `"${event.name || 'Unknown'}" (ID: ${event.pointEventId})`)
                .join(', ');
            
            console.warn(`Warning: ${missingPointEventIds.length} point event(s) do not exist in the database and will be skipped: ${missingEventDetails}`);
        }
        
        // Batch the query for existing student points to avoid query size limits
        // Only query for point events that actually exist in the database
        const existingPointsMap = new Map();
        
        for (let i = 0; i < existingPointEventIds.length; i += EVENT_BATCH_SIZE) {
            const eventBatch = existingPointEventIds.slice(i, i + EVENT_BATCH_SIZE);
            const { data: batchStudentPoints, error: existingPointsError } = await supabase
                .from('student_point')
                .select('student_id, point_event_id, point_value, input_score')
                .in('point_event_id', eventBatch);
                
            if (existingPointsError) {
                console.error('Error fetching existing student points:', existingPointsError);
                return "Error fetching existing student points";
            }
            
            // Add batch results to the map
            batchStudentPoints?.forEach(point => {
                const key = `${point.point_event_id}-${point.student_id}`;
                existingPointsMap.set(key, {
                    point_value: point.point_value,
                    input_score: point.input_score
                });
            });
        }
        
        let processedEvents = 0;
        let totalStudentPoints = 0;
        let updatedStudentPoints = 0;
        let skippedStudentPoints = 0;
        const changesToProcess: any[] = [];

        // For each event in the imported data
        // Filter out events with invalid pointEventIds AND events that don't exist in the database
        const validEvents = data.filter(event => {
            const eventId = event.pointEventId;
            // Check if eventId is valid
            if (eventId === undefined || eventId === null || isNaN(eventId) || eventId <= 0 || !Number.isInteger(eventId)) {
                return false;
            }
            // Check if event exists in database
            if (!existingPointEventIds.includes(eventId)) {
                console.warn(`Skipping event "${event.name || 'Unknown'}" (ID: ${eventId}) - point event does not exist in database`);
                return false;
            }
            return true;
        });
        
        // Report if any events were filtered out
        if (validEvents.length < data.length) {
            const filteredCount = data.length - validEvents.length;
            console.warn(`Filtered out ${filteredCount} event(s) with invalid or missing pointEventIds during processing`);
        }
        
        // If no valid events remain, return an error
        if (validEvents.length === 0) {
            return "No valid point events found to import. All events have invalid IDs or do not exist in the database.";
        }
        
        for (const event of validEvents) {
            processedEvents++;
            const pointEventId = event.pointEventId;
            
            // Defensive check - skip if somehow invalid (shouldn't happen after filtering)
            if (!pointEventId || isNaN(pointEventId) || pointEventId <= 0) {
                console.warn(`Skipping event with invalid pointEventId: ${pointEventId} (event: ${event.name || 'Unknown'})`);
                continue;
            }
            
            // For each student in this event
            for (const student of event.studentPoints) {
                totalStudentPoints++;
                
                // Skip if no score or empty
                if (student.input === undefined || student.input === null || String(student.input) === "") {
                    skippedStudentPoints++;
                    continue;
                }
                
                // Validate student ID before database operation
                if (!student.id || isNaN(student.id) || student.id <= 0) {
                    return `Invalid student ID: ${student.id}`;
                }
                
                // Check if this value is different from existing
                const key = `${pointEventId}-${student.id}`;
                const existingPoint = existingPointsMap.get(key);
                
                // Normalize values for comparison (round to avoid floating point precision issues)
                const normalizeValue = (value: any): number => {
                    if (value === null || value === undefined || value === '') return 0;
                    const parsed = parseFloat(value);
                    return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100; // Round to 2 decimal places
                };
                
                const newPointValue = normalizeValue(student.value);
                const newInputValue = normalizeValue(student.input);
                const existingPointValue = existingPoint ? normalizeValue(existingPoint.point_value) : 0;
                const existingInputValue = existingPoint ? normalizeValue(existingPoint.input_score) : 0;
                
                // Only process if values have changed (using epsilon comparison for floating point)
                const epsilon = 0.01;
                const pointValueChanged = Math.abs(newPointValue - existingPointValue) > epsilon;
                const inputValueChanged = Math.abs(newInputValue - existingInputValue) > epsilon;
                
                if (pointValueChanged || inputValueChanged) {
                    const insertData = {
                        created_at: DateTime.now().toISO(),
                        point_value: newPointValue,
                        student_id: student.id,
                        input_score: newInputValue,
                        notes: null,
                        point_event_id: pointEventId
                    };
                    
                    changesToProcess.push(insertData);
                    updatedStudentPoints++;
                } else {
                    skippedStudentPoints++;
                }
            }
        }
        
        // Process all changes in batches
        if (changesToProcess.length > 0) {
            const batchSize = 50; // Process 50 records at a time
            
            for (let i = 0; i < changesToProcess.length; i += batchSize) {
                const batch = changesToProcess.slice(i, i + batchSize);
                
                // Delete existing records for the specific student-event pairs in this batch
                // Since there's no unique constraint, we need to delete existing records first
                // to prevent duplicates when inserting. We must delete each pair individually
                // to avoid deleting records for other students/events.
                for (const change of batch) {
                    const { error: deleteError } = await supabase
                        .from('student_point')
                        .delete()
                        .eq('student_id', change.student_id)
                        .eq('point_event_id', change.point_event_id);
                    
                    if (deleteError) {
                        console.error('Delete error for student_point:', deleteError);
                        return `Error deleting existing student point (student: ${change.student_id}, event: ${change.point_event_id}): ${deleteError.message}`;
                    }
                }
                
                // Insert the new/updated records
                const { error: insertError } = await supabase
                    .from('student_point')
                    .insert(batch);
                    
                if (insertError) {
                    console.error('Batch insert error:', insertError);
                    return `Error importing student points batch: ${insertError.message}`;
                }
            }
        }
        
        return;
}
