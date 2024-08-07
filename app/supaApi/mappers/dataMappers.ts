import { Admin, AdminSchoolPair, PhoenixUser, PointGroup, RankingGroup, School, Student, StudentGroup, Teacher } from "@/app/dataClasses";
import { LinkedConversionRule, LinkedPointEvent, LinkedPointGroups, LinkedPointTemplate, LinkedRankingGroups, LinkedTeacher, StudentGroupWithRelations } from "./dataTypes";
import { Database } from "@/types/supabase";

export function adminResponseToData(
    adminResponse: Database['public']['Tables']['admin']['Row'],
    userResponse: Database['public']['Tables']['user']['Row']
): Admin {
    return new Admin(
        adminResponse.id,
        new Date(adminResponse.created_at),
        userResponseToData(userResponse)
    );
}

export function userResponseToData(
    userResponse: Database['public']['Tables']['user']['Row']
): PhoenixUser {
    return new PhoenixUser(
        userResponse.id,
        new Date(userResponse.created_at),
        userResponse.first_name,
        userResponse.last_name,
        userResponse.admin_id,
        userResponse.student_id,
        userResponse.supabase_id
    );
}

export function userToResponseData(
    userData: PhoenixUser
): Database['public']['Tables']['user']['Row'] {
    return {
        id: userData.id,
        created_at: userData.createdAt.toISOString(),
        first_name: userData.firstName,
        last_name: userData.lastName,
        admin_id: userData.adminId,
        student_id: null,
        teacher_id: null,
        supabase_id: userData.supabaseId
    }
}

export function schoolResponseToData(
    schoolResponse: Database['public']['Tables']['school']['Row']
): School {
    return new School(
        schoolResponse.id,
        schoolResponse.name
    );
}

export function adminSchoolPairResponseToData(
    adminSchoolPairResponse: Database['public']['Tables']['admin_school_pair']['Row']
): AdminSchoolPair {
    return new AdminSchoolPair(
        adminSchoolPairResponse.admin_id,
        adminSchoolPairResponse.school_id
    );
}

export function studentGroupWithRelationsResponseToData(
    studentGroupResponse: StudentGroupWithRelations
): StudentGroup {
    return new StudentGroup(
        studentGroupResponse.id,
        studentGroupResponse.name,
        studentGroupResponse.parent_id,
        studentGroupResponse.childGroups?.map(childGroup => studentGroupWithRelationsResponseToData(childGroup)),
        studentGroupResponse.teachers?.map(teacher => teacherResponseToData(teacher)),
        studentGroupResponse.students?.map(student => studentResponseToData(student)),
    );
}

export function studentGroupWithoutRelationsResponseToData(
    studentGroupResponse: Database['public']['Tables']['student_group']['Row']
): StudentGroup {
    return new StudentGroup(
        studentGroupResponse.id,
        studentGroupResponse.name,
        studentGroupResponse.parent_id,
        null,
        null,
        null
    );
}

export function studentResponseToData(
    studentResponse: Database['public']['Tables']['student']['Row']
): Student {
    return new Student(
        studentResponse.id,
        studentResponse.link_code,
        studentResponse.powerschool_id,
        studentResponse.first_name,
        studentResponse.last_name,
        studentResponse.birthdate ? new Date(studentResponse.birthdate) : null,
        studentResponse.grade,
        studentResponse.gender
    );
}

export function teacherResponseToData(
    teacherResponse: LinkedTeacher
): Teacher {
    return new Teacher(
        teacherResponse.id,
        new Date(teacherResponse.created_at),
        teacherResponse.first_name,
        teacherResponse.last_name,
        teacherResponse.link_code,
        teacherResponse.linked_user,
        teacherResponse.linkedUser ? userResponseToData(teacherResponse.linkedUser) : null,
        teacherResponse.school_id
    )
}

export function teacherToResponseData(
    teacherData: Teacher
): LinkedTeacher {
    return {
        id: teacherData.id,
        created_at: teacherData.createdAt.toISOString(),
        first_name: teacherData.firstName,
        last_name: teacherData.lastName,
        link_code: teacherData.linkCode,
        linked_user: teacherData.linkedUserId,
        linkedUser: teacherData.linkedUser ? userToResponseData(teacherData.linkedUser) : null,
        school_id: teacherData.schoolId
    }
}

export function rankingGroupResponseToData(
    rankingGroupResponse: LinkedRankingGroups
): RankingGroup {
    return new RankingGroup(
        rankingGroupResponse.id,
        rankingGroupResponse.name,
        rankingGroupResponse.linkedGroups?.map(group => studentGroupWithoutRelationsResponseToData(group)) || [],
    );
}

export function pointGroupResponseToData(
    pointGroupResponse: LinkedPointGroups
): PointGroup {
    return new PointGroup(
        pointGroupResponse.id,
        pointGroupResponse.name,
        pointGroupResponse.parent_id,
        pointGroupResponse.childGroups?.map(childGroup => pointGroupResponseToData(childGroup)) || [],
        pointGroupResponse.ranked,
        pointGroupResponse.color
    );
}