import { redirect } from "next/navigation";

export default function LegacyStudentScorebookRedirect({ params: { groupId } }: { params: { groupId: string } }) {
  redirect(`/scorebook/group/${groupId}`);
  return null;
}
