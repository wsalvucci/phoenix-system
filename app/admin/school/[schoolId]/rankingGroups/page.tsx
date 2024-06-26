import { createClient } from "@/utils/supabase/client"
import { Group } from "../dataClasses";

class RankingGroup {
    id: number;
    name: string;
    groups: Group[];

    constructor(
        id: number,
        name: string,
        groups: Group[]
    ) {
        this.id = id;
        this.name = name;
        this.groups = groups;
    }
}

const rankingGroupCard = async (rankingGroup: RankingGroup) => {
    return (
        <div className="bg-slate-500 shadow-md rounded p-3 mb-4">
            <div className="flex items-center justify-center text-3xl font-bold">{rankingGroup.name}</div>
            <div className="grid grid-cols-4 gap-5">
                {rankingGroup.groups.map((group) => {
                    return (
                        <div className="bg-slate-400 shadow-md rounded p-3 mb-4">
                            <div className="flex items-center justify-center text-3xl font-bold">{group.name}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    )
}

const dummyData = [
    new RankingGroup(1, "Ranking Group 1", [
        new Group(1, "Group 1"),
        new Group(2, "Group 2"),
        new Group(3, "Group 3"),
        new Group(4, "Group 4"),
    ]),
    new RankingGroup(2, "Ranking Group 2", [
        new Group(5, "Group 5"),
        new Group(6, "Group 6"),
        new Group(7, "Group 7"),
        new Group(8, "Group 8"),
    ]),
    new RankingGroup(3, "Ranking Group 3", [
        new Group(9, "Group 9"),
        new Group(10, "Group 10"),
        new Group(11, "Group 11"),
        new Group(12, "Group 12"),
    ]),
]

export default function RankingGroupsDashboard({ params: { schoolId } }: { params: { schoolId: string } }) {

    const supabase = createClient();

    return (
        <div>
            <h1>Ranking Groups Dashboard</h1>
            <div>
                <div>
                    <h2>Your Ranking Groups</h2>
                    <div className="grid grid-cols-4 gap-5">
                        {dummyData.map((rankingGroup) => {
                            return (
                                rankingGroupCard(rankingGroup)
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}