import linkTeacher from "../server/linkTeacher";

export default async function clientLinkTeacher(teacherId: number, linkCode: string): Promise<{ success: boolean, message: string, linkId: number | null }> {
    return await linkTeacher(teacherId, linkCode);
}