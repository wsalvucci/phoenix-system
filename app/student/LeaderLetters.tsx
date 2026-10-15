import type { LeaderGroupLetters, OwnLedLetters } from "@/app/supaApi/mappers/rpcMappers";
import { leaderNoticeSentence } from "@/app/supaApi/mappers/rpcMappers";

/**
 * Groups You Lead, with letters (DATA_DISCLOSURE.md D13, §10.7 L1-L12).
 * L6: members in the server's fixed order (last, first), no sort, filter or highlight. A letter is
 * plain foreground text at the same size and weight as the names. A point group's colour marks its
 * column header only. L8: a hidden column is one neutral line, the same for every reason.
 */
export function LeaderGroupLettersTable({ group }: { group: LeaderGroupLetters }) {
    const shown = group.pointGroups.filter((pg) =>
        group.members.some((m) => m.letters.some((l) => l.pointGroupId === pg.id && l.letter !== null)));
    const hidden = group.pointGroups.filter((pg) => !shown.includes(pg));

    return (
        <div>
            <h4 className="text-base font-semibold">{group.groupName}</h4>
            <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-base">
                    <thead>
                        <tr className="border-b border-rule">
                            <th scope="col" className="py-2 pr-4 font-semibold">Name</th>
                            {shown.map((pg) => (
                                <th key={pg.id} scope="col" className="py-2 pr-4 font-semibold">
                                    <span className="inline-block h-3 w-1 align-middle" style={{ backgroundColor: pg.color }} aria-hidden="true" />{" "}
                                    {pg.name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {group.members.map((member) => (
                            <tr key={member.key} className="border-b border-rule last:border-b-0">
                                <td className="min-h-11 py-3 pr-4">{member.firstName} {member.lastName}</td>
                                {shown.map((pg) => (
                                    <td key={pg.id} className="py-3 pr-4">
                                        {member.letters.find((l) => l.pointGroupId === pg.id)?.letter ?? ""}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {hidden.map((pg) => (
                <p key={pg.id} className="mt-2 text-sm text-muted-foreground">{pg.name}: Not shown for this group</p>
            ))}
        </div>
    );
}

/** Names-only fallback for a led group with no letter rows (L1: the leader is left out). */
export function LeaderGroupNames({ name, members }: { name: string; members: { key: string; firstName: string; lastName: string }[] }) {
    return (
        <div>
            <h4 className="text-base font-semibold">{name}</h4>
            <ul className="mt-2">
                {members.map((member) => (
                    <li key={member.key} className="min-h-11 truncate border-b border-rule py-3 last:border-b-0">
                        {member.firstName} {member.lastName}
                    </li>
                ))}
            </ul>
        </div>
    );
}

/**
 * L10: every member of a led group is told who can see their letters, and sees those letters.
 * It never says whether a column is currently hidden in the leader's view.
 */
export function LedLettersNotice({ groups, possessive }: { groups: OwnLedLetters[]; possessive?: string }) {
    if (groups.length === 0) return null;
    return (
        <div className="space-y-4">
            {groups.map((group) => (
                <div key={group.groupId}>
                    <p className="text-base">{leaderNoticeSentence(group, possessive ? { possessive } : "your")}</p>
                    {group.letters.length > 0 && (
                        <ul className="mt-2">
                            {group.letters.map((l) => (
                                <li key={l.pointGroupId} className="flex min-h-11 items-center justify-between gap-4 border-b border-rule py-2 last:border-b-0">
                                    <span>{l.pointGroupName}</span>
                                    <span>{l.letter ?? "No letter yet"}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ))}
        </div>
    );
}
