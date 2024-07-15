"use server";
import { LinkedPointGroups } from "@/app/supaApi/mappers/dataTypes"
import getOwnTeacherData from "../getOwnTeacherData"
import { getAllPointGroups } from "../../shared/pointGroups/getPointGroup"

export default async function teacherGetSchoolPointGroups(): Promise<LinkedPointGroups[] | null> {
    const teacherData = await getOwnTeacherData()

    if (!teacherData) {
        return null
    }

    const pointGroups = getAllPointGroups(teacherData.school_id)

    if (!pointGroups) {
        return null
    }

    return pointGroups
}