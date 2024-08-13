import { Student, StudentRankData } from "@/app/dataClasses";
import HeaderRank from "./headerRank";
import PointCategoryTotals from "./pointCategoryTotals";
import RecentPoints from "./recentPoints";
import Color from "color";
import Script from "next/script";

const rankToColor = (rank: number) => {
    if (rank === 1) {
        return Color("#FFD700");
    } else if (rank === 2) {
        return Color("#C0C0C0");
    } else if (rank === 3) {
        return Color("#CD7F32");
    } else if (rank === 4) {
        return Color("#800080");
    } else if (rank === 5) {
        return Color("#008080");
    } else if (rank <= 10) {
        return Color("#DC143C");
    } else {
        return Color("#000000");
    }
}

const goldMetalStyle = {
    background: 'linear-gradient(135deg, #FFD700 0%, #FFC200 40%, #FFB14E 100%)',
    border: '2px solid #B8860B',
    borderRadius: '8px',
    boxShadow: `
      inset 0 0 10px rgba(255, 215, 0, 0.6),
      inset 0 0 20px rgba(255, 215, 0, 0.4),
      0 0 10px rgba(0, 0, 0, 0.5)
    `,
    width: '200px',
    height: '200px',
    margin: '20px auto',
    position: 'relative',
    overflow: 'hidden',
};

const glossyEffectStyle = {
    content: '""',
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: 'rgba(255, 255, 255, 0.3)',
    transform: 'rotate(45deg)',
    transition: 'all 0.3s ease-in-out',
};

const containerStyle = {
    position: 'relative',
    width: '100%',
    height: '100%',
    '&:hover::before': {
        background: 'rgba(255, 255, 255, 0.1)',
    },
};

export default function ContainerComponent(
    {
        studentData, studentRankData
    }: {
        studentData: Student,
        studentRankData: StudentRankData
    }
) {
    const testRank = 7
    return (
        <div
            className="animate-in w-full h-full rounded-3xl border text-white"
            style={{
                //background: 'linear-gradient(135deg, #FFD700 0%, #fcfbfa 20%, #FFC200 40%, #fcfbfa 80%, #FFB14E 100%)',
                background: `
                linear-gradient(135deg,
                ${rankToColor(testRank).hex()} 0%,
                #fcfbfa 20%,
                ${rankToColor(testRank).darken(0.05).hex()} 40%,
                #fcfbfa 80%,
                ${rankToColor(testRank).darken(0.1).hex()} 100%)
                `
            }}
        >
            <div className="m-6 p-6 bg-black rounded-3xl"
                style={{
                    //background: 'linear-gradient(135deg, #613c0b 0%, #c3992f 40%, #613c0b 100%)',
                    background: `
                    linear-gradient(135deg,
                    ${rankToColor(testRank).darken(0.1).hex()} 0%,
                    ${rankToColor(testRank).darken(0.4).hex()} 40%,
                    ${rankToColor(testRank).darken(0.1).hex()} 100%)`,
                    // boxShadow: `
                    //   inset 0 0 10px rgba(127, 107, 0, 0.6),
                    //   inset 0 0 20px rgba(127, 107, 0, 0.4),
                    //   0 0 10px rgba(0, 0, 0, 0.5)
                    // `
                    boxShadow: `
                    inset 0 0 10px ${rankToColor(testRank).darken(0.5).rgb().string()},
                    inset 0 0 20px ${rankToColor(testRank).darken(0.5).rgb().string()},
                    `
                }}>
                <HeaderRank
                    firstName={studentData?.firstName || ""}
                    grade={studentData?.grade || 0}
                    lastName={studentData?.lastName || ""}
                    totalPoints={studentRankData?.ranks.totalPoints || 0}
                    totalRank={studentRankData?.ranks.totalRank || 0}
                />
                <PointCategoryTotals categories={studentRankData.ranks.pointGroupRanks} />
                {/* <StudentCategoryTotals categories={studentRankData.ranks.studentGroupRanks} /> */}
                <RecentPoints recentPoints={studentRankData.points} />
            </div>
        </div>
    )
}