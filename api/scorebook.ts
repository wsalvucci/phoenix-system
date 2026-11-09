"use server";

import supabaseServiceClient from "@/app/supaApi/server/supabaseServiceClient";
import { getOwnStudent } from "@/app/supaApi/server/sessionActor";
import { createClient } from "@/utils/supabase/server";
import { DuplicateScorebookEventsInput, DuplicateScorebookEventsResult, NewScorebookData, NewScorebookPointEvent, TeacherTimeframe } from "@/types/domain";
import {
  newGetScorebookData,
  createPointEvent,
  editPointEvent,
  deletePointEvent,
  getTeacherSchoolTimeframes,
  updateStudentPointsByAssistant,
  duplicateScorebookEvents,
} from "@/app/supaApi/server/teacher/teacherServerActions";
import { checkTeacherAccessToStudentGroup } from "@/app/supaApi/server/teacher/studentGroups/checkTeacherAccessToStudentGroup";

export type ScorebookAccess = {
  role: "teacher" | "assistantFull" | "assistantLimited" | "none";
  allowedPointEventIds: number[] | null;
};

export async function getScorebookAccess(studentGroupId: number): Promise<ScorebookAccess> {
  const supabase = await supabaseServiceClient();
  const authClient = createClient();
  const { data: authData } = await authClient.auth.getUser();
  if (!authData?.user) return { role: "none", allowedPointEventIds: null };

  const isTeacher = await checkTeacherAccessToStudentGroup(studentGroupId);
  if (isTeacher) return { role: "teacher", allowedPointEventIds: null };

  // Assistant check
  const { data: userRow } = await supabase
    .from("user")
    .select("id")
    .eq("supabase_id", authData.user.id)
    .single();
  if (!userRow) return { role: "none", allowedPointEventIds: null };

  // teaching_assistant.student_id is a student id: use the student this account owns, not user.id.
  const ownStudent = await getOwnStudent(userRow.id);
  if (!ownStudent) return { role: "none", allowedPointEventIds: null };

  const { data: assistant } = await supabase
    .from("teaching_assistant")
    .select("id, full_access")
    .eq("group_id", studentGroupId)
    .eq("student_id", ownStudent.id)
    .single();
  if (!assistant) return { role: "none", allowedPointEventIds: null };
  if (assistant.full_access) return { role: "assistantFull", allowedPointEventIds: null };

  const { data: accessRows } = await supabase
    .from("teaching_assistant_point_event")
    .select("point_event_id")
    .eq("assistant_id", assistant.id);
  return {
    role: "assistantLimited",
    allowedPointEventIds: (accessRows || []).map(r => r.point_event_id),
  };
}

export async function getScorebook(studentGroupId: number, timeframeId?: number | null): Promise<NewScorebookData> {
  return await newGetScorebookData(studentGroupId, timeframeId);
}

export async function saveEventPoints(
  studentGroupId: number,
  pointEventId: number,
  updates: { studentId: number; input: number; value: number; notes: string }[],
): Promise<boolean> {
  return await updateStudentPointsByAssistant(studentGroupId, pointEventId, updates);
}

export async function createScorebookEvent(
  studentGroupId: number,
  pointGroupId: number,
  date: string,
  name: string,
  maxInput: number,
  conversionFormula: string | null = null,
): Promise<boolean> {
  return await createPointEvent(studentGroupId, pointGroupId, date, name, maxInput, conversionFormula);
}

export async function editScorebookEvent(
  event: NewScorebookPointEvent,
  studentGroupId: number,
): Promise<boolean> {
  return await editPointEvent(event, studentGroupId);
}

export async function deleteScorebookEvent(pointEventId: number): Promise<boolean> {
  return await deletePointEvent(pointEventId);
}

export async function getScorebookTimeframes(studentGroupId: number): Promise<TeacherTimeframe[]> {
  // Only teachers can fetch all timeframes
  const isTeacher = await checkTeacherAccessToStudentGroup(studentGroupId);
  if (!isTeacher) return [];
  return await getTeacherSchoolTimeframes(studentGroupId);
}

export async function duplicateScorebookTimeframeEvents(
  input: DuplicateScorebookEventsInput,
): Promise<DuplicateScorebookEventsResult> {
  return await duplicateScorebookEvents(input);
}

