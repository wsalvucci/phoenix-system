import linkTeacher from "../server/linkTeacher";

export default async function clientLinkTeacher(teacherId: number, linkCode: string): Promise<{ success: boolean, message: string }> {
    return await linkTeacher(teacherId, linkCode);
}