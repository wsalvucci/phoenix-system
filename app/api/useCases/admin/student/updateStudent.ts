import supabaseClient from "@/app/api/supabaseClient";

export default async function updateStudent(studentId: number, firstName: string, lastName: string, birthdate: Date, grade: number, gender: string): Promise<boolean> {
    const supabase = supabaseClient;
    console.log(birthdate.toUTCString());
    const { error: studentError } = await supabase.rpc('update_student_data', {
        provided_student_id: studentId,
        provided_student_first_name: firstName,
        provided_student_last_name: lastName,
        provided_student_birthdate: birthdate.toUTCString(),
        provided_student_grade: grade,
        provided_student_gender: gender
    });
    if (studentError) {
        console.error(studentError);
        return false;
    }

    return true
}