import { numberToOrdinal } from "@/app/dataClasses"
import { displayRankTier } from "@/lib/rankTier"
import Color from "color";
import { Quicksand } from "next/font/google"

const customFont = Quicksand({
    weight: "400",
    subsets: ["latin"]
});

function rankToSpan(rank: number): number {
    if (rank === 1) return 1
    else if (rank <= 5) return 0.25
    else if (rank <= 10) return 0.2
    else return 0.1
}

function rankToNameSize(rank: number): string {
    if (rank === 1) return '2rem'
    else if (rank <= 5) return '1.25rem'
    else if (rank <= 10) return '1.1rem'
    else return '0.9rem'
}

function rankToRankSize(rank: number): string {
    if (rank === 1) return '2rem'
    else if (rank <= 5) return '1.25rem'
    else if (rank <= 10) return '1.1rem'
    else return '0.9rem'
}

function rankToTotalPointsSize(rank: number): string {
    if (rank === 1) return '2rem'
    else if (rank <= 5) return '1.25rem'
    else if (rank <= 10) return '1.1rem'
    else return '0.9rem'
}

export default function TopStudentsByGroup(
    {
        title,
        students
    }: {
        title: string,
        students: {
            id: number,
            name: string,
            totalPoints: number,
            featuredPoints: number,
            pointsByPointGroup: {
                groupId: number,
                groupName: string,
                groupPoints: number,
                groupColor: string,
            }[]
        }[]
    }
) {
    return (
        <div className={`${customFont.className} h-full`}>
            <div className="flex justify-center align-middle text-5xl pb-2 font-extrabold" style={{
                height: '10%'
            }}>
                {title}
            </div>
            <div className="flex flex-wrap" style={{
                height: '90%'
            }}>
                {
                    students.map((student, index) => {
                        return (
                            <div key={student.id} className="my-1" style={{
                                width: `${100 * rankToSpan(index + 1)}%`,
                            }}>
                                <div className="h-full mx-1 p-2 text-center" data-rank-tier={displayRankTier(index + 1)} style={{
                                    backgroundColor: 'hsl(var(--rank))'
                                }}>
                                    <div className="p-3 rounded-lg bg-slate-900 h-full">
                                        <div style={{
                                            height: index == 0 ? '50%' : '90%'
                                        }}>
                                            {
                                                index == 0 ?
                                                    <div className="flex justify-center gap-5">
                                                        <div className="font-extrabold" style={{ fontSize: rankToRankSize(index + 1) }}>{numberToOrdinal(index + 1)}</div>
                                                        <div className="font-extrabold" style={{ fontSize: rankToNameSize(index + 1) }}>{student.name}</div>
                                                        <div className="font-extrabold" style={{ fontSize: rankToTotalPointsSize(index + 1) }}>{student.featuredPoints.toLocaleString()}pts</div>
                                                    </div> :
                                                    <div>
                                                        <div className="font-extrabold" style={{ fontSize: rankToRankSize(index + 1) }}>{numberToOrdinal(index + 1)}</div>
                                                        <div className="font-extrabold" style={{ fontSize: rankToNameSize(index + 1) }}>{student.name}</div>
                                                        <div className="font-extrabold" style={{ fontSize: rankToTotalPointsSize(index + 1) }}>{student.featuredPoints.toLocaleString()}pts</div>
                                                    </div>
                                            }
                                        </div>
                                        <div style={{
                                            height: index == 0 ? '50%' : '10%'
                                        }}>
                                            {
                                                index == 0 && <div className="text-md font-extrabold rounded-lg flex">
                                                    {
                                                        student.pointsByPointGroup.map((pointGroup, idx) =>
                                                            <div key={idx} className="h-5" style={{
                                                                width: `${(pointGroup.groupPoints / student.totalPoints) * 100}%`,
                                                                color: Color(pointGroup.groupColor).lighten(0.5).toString(),
                                                            }}>
                                                                {pointGroup.groupName}
                                                            </div>
                                                        )
                                                    }
                                                </div>
                                            }
                                            <div className="text-md font-extrabold rounded-lg flex">
                                                {
                                                    student.pointsByPointGroup.map((pointGroup, pointGroupIdx, array) =>
                                                        <div key={pointGroupIdx} className="h-full" style={{
                                                            height: index < 10 ? '1.25rem' : '0.75rem',
                                                            width: `${(pointGroup.groupPoints / student.totalPoints) * 100}%`,
                                                            backgroundColor: Color(pointGroup.groupColor).darken(0.5).toString(),
                                                            borderStartStartRadius: pointGroupIdx == 0 ? '3rem' : '0rem',
                                                            borderEndStartRadius: pointGroupIdx == 0 ? '3rem' : '0rem',
                                                            borderStartEndRadius: pointGroupIdx == array.length - 1 ? '3rem' : '0rem',
                                                            borderEndEndRadius: pointGroupIdx == array.length - 1 ? '3rem' : '0rem'
                                                        }}>
                                                            {
                                                                index < 10 && pointGroup.groupPoints / student.totalPoints >= 0.1 &&
                                                                Math.round((pointGroup.groupPoints / student.totalPoints) * 100) + '%'
                                                            }
                                                            {
                                                                index == 0 && ' - ' + pointGroup.groupPoints.toLocaleString() + 'pts'
                                                            }
                                                        </div>
                                                    )
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                }
            </div>
        </div>
    )
}