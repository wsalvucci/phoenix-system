"use client";
import { metalStyle, metalStyleGradient, rankToColor, shinyBackgroundStyle } from "@/app/dataClasses";
import { featuredDashGetGlobalStats } from "@/app/supaApi/universal/universalApi";
import { GlobalPoints } from "@/app/supaApi/universal/utils/types";
import { createClient } from "@/utils/supabase/client";
import { DateTime } from "luxon";
import { Azeret_Mono, Quicksand } from "next/font/google";
import { useEffect, useState } from "react";
const Quote = require("inspirational-quotes");

const customFont = Quicksand({
        weight: "400",
        subsets: ["latin"]
});

const azeret = Azeret_Mono({
    weight: "400",
    subsets: ["latin"]
});

const metalTextShadow = `1px 1px 2px rgba(0, 0, 0, 1),
                         -1px -1px 2px rgba(255, 255, 255, 0.2),
                         2px 2px 4px rgba(0, 0, 0, 1),
                         -2px -2px 4px rgba(255, 255, 255, 0.3)`

export default function GlobalDashboard() {

        const [globalDashData, setGlobalDashData] = useState<GlobalPoints | null>(null);
        const [timeframe, setTimeframe] = useState<number | null>(null);

        const updateData = async (timeframeId: number | null) => {
                console.log("Updating data");
                featuredDashGetGlobalStats(12, timeframeId).then((data) => {
                        console.log(data)
                        setGlobalDashData(data);
                })
        }

        const supabase = createClient();
        const broadcastChannel = supabase.channel("student-points-channel");

        broadcastChannel.on(
                'broadcast',
                { event: 'sync' },
                (payload) => {
                        console.log('Received broadcast:', payload);
                        updateData(timeframe);
                }
        ).subscribe();

        useEffect(() => {
                updateData(timeframe);
        }, [])

        const changeTimeframe = (timeframeId: number) => {
                setTimeframe(timeframeId);
                updateData(timeframeId);
        }

        const StudentPointTile = ({
                fullName,
                points,
                lastMonthPoints,
                rank,
                rankChange
        }: {
                fullName: string,
                points: number | null,
                lastMonthPoints: number | null,
                rank: number,
                rankChange: number | null
        }) => (
                <div className="text-lg border grid gap-1 py-1 px-2 mx-2" style={{
                        ...shinyBackgroundStyle(rankToColor(rank+1).toString()),
                        gridTemplateColumns: "50px 200px 2fr 1fr",
                        textShadow: metalTextShadow
                }}>
                        {
                                rankChange !== null && rankChange !== 0 ?
                                <div className={`flex justify-start place-items-center text-xl ${azeret.className}`} style={{
                                        color: rankChange > 0 ? "#00CC00" : "red"
                                }}>
                                        {rankChange > 0 ? "+" : ""}{rankChange}
                                </div> : <div />
                        }
                        <div className="flex justify-start place-items-center" style={{
                                textWrap: "nowrap",
                                overflow: "hidden",
                        }}>
                                {fullName}
                        </div>
                        {
                                points !== null &&
                                <div className={`flex justify-end place-items-center ${azeret.className}`}>
                                        {points.toLocaleString()}
                                </div>
                        }
                        {
                                lastMonthPoints !== null && points !== null &&
                                <div className={`flex justify-end place-items-center text-sm ${azeret.className}`} style={{ color: "#00CC00"}}>
                                        +{(points - (lastMonthPoints ?? 0)).toLocaleString()}
                                </div>
                        }
                </div>
        )

        const EmptyStudentPointTile = () => (
                <div className="text-lg border grid py-1 px-2 mx-2" style={{
                        background: metalStyle("#000"),
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        //backgroundPositionX: `${(Math.random() * 20) - 40}em`,
                        gridTemplateColumns: "2fr 1fr",
                        textShadow: metalTextShadow
                }}>
                        <div className="flex justify-start place-items-center" style={{
                                textWrap: "nowrap"
                        }}>
                                :
                        </div>
                        <div className="flex justify-end place-items-center">
                                :
                        </div>
                </div>
        )

        const summerImage = "https://cdn.midjourney.com/25cb2c71-19ba-4df8-b4ce-87fd9c61c400/0_0.png"
        const autumnImage = "https://cdn.midjourney.com/9238d38f-7e5d-404a-8348-94aa6862e583/0_1.png"
        const halloweenImage = "https://cdn.midjourney.com/dcff86bf-6e0a-490c-8d9a-dabf8b57bebd/0_2.png"
        const thanksgivingImage = "https://cdn.midjourney.com/d8260d25-7f96-48b6-82c8-10adf86793b4/0_2.png"
        const christmasImage = "https://cdn.midjourney.com/e9a1702e-8700-4256-b5de-b5c86dbd7347/0_2.png"
        const winterImage = "https://cdn.midjourney.com/7864ac3b-9750-49c4-b7b0-ffb134b73a00/0_3.png"

        const seasonalImage = (): string => {
                const currentTime = DateTime.now();
                const currentMonth = currentTime.month;
                const currentDay = currentTime.day;
                switch (currentMonth) {
                        case 6:
                                if (currentDay >= 21) {
                                        return summerImage;
                                } else {
                                        return "";
                                }
                        case 7:
                        case 8:
                                return summerImage;
                        case 9:
                                if (currentDay < 22) {
                                        return summerImage;
                                } else {
                                        return autumnImage;
                                }
                        case 10:
                                if (currentDay < 24) {
                                        return autumnImage;
                                } else {
                                        return halloweenImage;
                                }
                        case 11:
                                if (currentDay < 15) {
                                        return autumnImage;
                                } else {
                                        return thanksgivingImage;
                                }
                        case 12:
                                if (currentDay < 15) {
                                        return autumnImage
                                } else {
                                        return christmasImage;
                                }
                        case 1: {
                                return winterImage;
                        }
                        default: return "";
                }
        }

        const isToday = (dateTime: DateTime) => {
                const curDate = DateTime.now()
                return (curDate.year == dateTime.year) && (curDate.month == dateTime.month) && (curDate.day == dateTime.day)
        }

        return (
                <div className={`grid gap-1 w-full min-h-screen max-h-screen overflow-clip ${customFont.className}`} style={{
                        gridTemplateColumns: "1fr 4fr 1fr",
                        background: `linear-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.75)), url('${seasonalImage()}')`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        color: "#eee"
                }}>
                        <div className="border rounded-xl p-5 overflow-auto">
                                <div style={{height: "3%"}}>
                                        <select className="text-lg bg-transparent" defaultValue={
                                                globalDashData?.timeframes.find(timeframe => timeframe.isActive)?.id
                                        }
                                        onChange={(event) => {
                                                changeTimeframe(parseInt(event.target.value))
                                        }}
                                        >
                                                {
                                                        globalDashData?.timeframes.map(timeframe => (
                                                                <option className="text-black" key={timeframe.id} value={timeframe.id}>
                                                                        {timeframe.name}
                                                                </option>
                                                        ))
                                                }
                                        </select>
                                </div>
                                <div style={{height: "17%"}}>
                                        <div className="text-2xl flex justify-center">
                                                {
                                                        Quote.getQuote().text
                                                }
                                        </div>
                                        <div className="text-xl flex justify-center align-middle">
                                                {
                                                        "- " + Quote.getQuote().author
                                                }
                                        </div>
                                </div>
                                <div style={{height: "55%"}}>
                                <div className="text-2xl border-b mb-1 flex justify-center">Upcoming</div>
                                <div className="grid grid-cols-1 gap-5">
                                        {
                                                globalDashData?.pointEvents
                                                        .filter(event => DateTime.fromISO(event.date).plus({ 'days': 1 }) > DateTime.now())
                                                        .sort((a, b) => DateTime.fromISO(a.date).toUnixInteger() - DateTime.fromISO(b.date).toUnixInteger())
                                                        .map(event => (
                                                                <div key={event.id} className="p-2" style={{
                                                                        background: metalStyle(globalDashData?.pointGroups.find(pointGroup => pointGroup.id === event.pointGroup)?.color || '#000'),
                                                                        backgroundSize: "cover",
                                                                        backgroundPosition: "center",
                                                                        //backgroundPositionX: `${(Math.random() * 20) - 40}em`,
                                                                        textShadow: metalTextShadow
                                                                }}>
                                                                        <div className="grid" style={{
                                                                                gridTemplateColumns: "3fr 1fr",
                                                                        }}>
                                                                                <div>
                                                                                        <div className="text-2xl">{event.name}</div>
                                                                                        <div className="text-lg">{
                                                                                                event.maxPoints
                                                                                        }pts</div>
                                                                                </div>
                                                                                <div className="text-lg flex justify-end place-items-center">
                                                                                        <div className="grid grid-cols-1">
                                                                                                {
                                                                                                        event.date <= DateTime.now().plus({ days: 7 }).toISODate() ?

                                                                                                                <div className="flex justify-end">
                                                                                                                        {
                                                                                                                                isToday(DateTime.fromISO(event.date)) ? 'Today' : DateTime.fromISO(event.date).toFormat('EEEE')
                                                                                                                        }
                                                                                                                </div> :
                                                                                                                <div className="flex justify-end">
                                                                                                                        {DateTime.fromISO(event.date).toFormat('MMM d')}
                                                                                                                </div>

                                                                                                }
                                                                                        </div>
                                                                                </div>
                                                                        </div>
                                                                </div>
                                                        ))
                                        }
                                </div>
                                </div>
                                <div className="grid grid-cols-1 gap-1" style={{height: "25%"}}>
                                        <div className="text-2xl flex justify-center">
                                                Color Guide
                                        </div>
                                        <StudentPointTile
                                                fullName="1st Place"
                                                points={null}
                                                lastMonthPoints={null}
                                                rank={0}
                                                rankChange={null} />
                                        <StudentPointTile
                                                fullName="2nd Place"
                                                points={null}
                                                lastMonthPoints={null}
                                                rank={1}
                                                rankChange={null} />
                                        <StudentPointTile
                                                fullName="3rd Place"
                                                points={null}
                                                lastMonthPoints={null}
                                                rank={2}
                                                rankChange={null} />
                                        <StudentPointTile
                                                fullName="4th Place"
                                                points={null}
                                                lastMonthPoints={null}
                                                rank={3}
                                                rankChange={null} />
                                        <StudentPointTile
                                                fullName="5th Place"
                                                points={null}
                                                lastMonthPoints={null}
                                                rank={4}
                                                rankChange={null} />
                                        <StudentPointTile
                                                fullName="6th - 10th Place"
                                                points={null}
                                                lastMonthPoints={null}
                                                rank={5}
                                                rankChange={null} />
                                        <StudentPointTile
                                                fullName="11th - 20th Place"
                                                points={null}
                                                lastMonthPoints={null}
                                                rank={10}
                                                rankChange={null} />
                                </div>
                        </div>
                        <div className="border rounded-xl p-5">
                                <div>
                                        <div className="text-2xl flex justify-center border-b mb-1">Top Groups</div>
                                        {
                                                globalDashData?.rankingGroups.map((rankingGroup, index) => (
                                                        <div key={rankingGroup.id} className="grid grid-cols-6 px-1 my-1 gap-1">
                                                                <div className="flex justify-center place-items-center text-2xl" style={{
                                                                        background: metalStyle('#000'),
                                                                        backgroundSize: "cover",
                                                                        backgroundPosition: "center",
                                                                        //backgroundPositionX: `${(Math.random() * 20) - 40}em`,
                                                                        textShadow: metalTextShadow
                                                                }}>
                                                                        {rankingGroup.name}
                                                                </div>
                                                                {
                                                                        rankingGroup.studentGroups.sort((a, b) => {
                                                                                var aGroup = globalDashData?.studentGroups.find(studentGroup => studentGroup.id === a)
                                                                                var bGroup = globalDashData?.studentGroups.find(studentGroup => studentGroup.id === b)
                                                                                var aPoints = (aGroup?.averagePoints ?? 0) + (aGroup?.rawPoints ?? 0)
                                                                                var bPoints = (bGroup?.averagePoints ?? 0) + (bGroup?.rawPoints ?? 0)
                                                                                return bPoints - aPoints
                                                                        })
                                                                                .slice(0, 5)
                                                                                .map((studentGroup, rankIndex) => {
                                                                                        var group = globalDashData?.studentGroups.find(group => group.id === studentGroup)
                                                                                        if (!group) return <></>
                                                                                        return (
                                                                                                <div key={group.id} className="text-lg grid grid-cols-1 place-items-center" style={{
                                                                                                        ...shinyBackgroundStyle(rankToColor(rankIndex + 1).toString()),
                                                                                                        textShadow: metalTextShadow
                                                                                                }}>
                                                                                                                <div className="flex justify-center">
                                                                                                                        {group.name}
                                                                                                                </div>
                                                                                                                <div className={`w-full px-5 grid ${azeret.className}`} style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                                                                                                                        <div />
                                                                                                                        <div className="flex items-center justify-center">
                                                                                                                                {Math.round(group.averagePoints + group.rawPoints).toLocaleString()}
                                                                                                                        </div>
                                                                                                                        <div className="flex items-end justify-end" style={{ color: "#00CC00" }}>
                                                                                                                                +{Math.round((group.averagePoints + group.rawPoints) - (group.lastMonthAveragePoints + group.lastMonthRawPoints)).toLocaleString()}
                                                                                                                        </div>
                                                                                                                </div>
                                                                                                                <div className="flex justify-center">
                                                                                                                        {
                                                                                                                                (() => {
                                                                                                                                        const topStudent = globalDashData?.students.filter(student => student.studentGroups.includes(group?.id ?? -1)).sort((a, b) => b.totalPoints - a.totalPoints)[0]
                                                                                                                                        return topStudent ? topStudent.firstName + " " + topStudent.lastName : ""
                                                                                                                                })()
                                                                                                                        }
                                                                                                                </div>
                                                                                                </div>
                                                                                        )
                                                                                })
                                                                }
                                                        </div>
                                                ))
                                        }
                                </div>
                                <div>
                                        <div className="text-2xl flex justify-center border-b mb-1">Top Students</div>
                                        <div className={`grid grid-cols-${(globalDashData?.pointGroups.length ?? 0) + 1} gap-1`}>
                                                <div className="text-xl border px-1 flex justify-center place-items-center" style={{
                                                        background: metalStyleGradient([
                                                                { color: '#ff0000', percent: 0 },
                                                                { color: '#ffa500', percent: 17 },
                                                                { color: '#ffff00', percent: 34 },
                                                                { color: '#00ff00', percent: 50 },
                                                                { color: '#0000ff', percent: 67 },
                                                                { color: '#4b0082', percent: 84 },
                                                                { color: '#ee82ee', percent: 100 },
                                                        ]),
                                                        backgroundSize: "cover",
                                                        backgroundPosition: "center",
                                                        textShadow: metalTextShadow
                                                }}>Overall</div>
                                                {
                                                        globalDashData?.pointGroups.sort((a, b) => (a.id - b.id)).map(pointGroup => (
                                                                <div key={pointGroup.id} className="text-xl border px-1 flex justify-center place-items-center" style={{
                                                                        background: metalStyle(pointGroup.color),
                                                                        backgroundSize: "cover",
                                                                        backgroundPosition: "center",
                                                                        //backgroundPositionX: `${(Math.random() * 20) - 40}em`,
                                                                        textShadow: metalTextShadow
                                                                }}>{pointGroup.name}</div>
                                                        ))
                                                }
                                                {
                                                        [...Array(10)].map((_, index) => {
                                                                const ovrStudent = globalDashData?.students.sort((a, b) => b.totalPoints - a.totalPoints)[index]
                                                                const ovrStudentRankChange = (ovrStudent?.lastMonthRank ?? 0) - (ovrStudent?.rank ?? 0)
                                                                return (
                                                                        <>
                                                                                <StudentPointTile
                                                                                        key={index}
                                                                                        fullName={globalDashData?.students.sort((a, b) => b.totalPoints - a.totalPoints)[index]?.firstName + " " + globalDashData?.students[index]?.lastName}
                                                                                        points={globalDashData?.students.sort((a, b) => b.totalPoints - a.totalPoints)[index]?.totalPoints || 0}
                                                                                        lastMonthPoints={globalDashData?.students.sort((a, b) => b.totalPoints - a.totalPoints)[index]?.lastMonthPoints || 0}
                                                                                        rank={index}
                                                                                        rankChange={ovrStudentRankChange}
                                                                                />
                                                                                {
                                                                                        globalDashData?.pointGroups.sort((a, b) => (a.id - b.id)).map(pointGroup => {
                                                                                                const student = globalDashData.students.sort((a, b) => {
                                                                                                        const aPoints = a.pointGroups.find(group => group.id === pointGroup.id)?.points || 0
                                                                                                        const bPoints = b.pointGroups.find(group => group.id === pointGroup.id)?.points || 0
                                                                                                        return bPoints - aPoints
                                                                                                }).at(index)
                                                                                                const pointGroupData = student?.pointGroups.find(group => group.id === pointGroup.id)
                                                                                                if (!pointGroupData) return <></>
                                                                                                return (
                                                                                                        <StudentPointTile
                                                                                                                key={pointGroup.id + ":" + index}
                                                                                                                fullName={student?.firstName + " " + student?.lastName}
                                                                                                                points={pointGroupData.points || 0}
                                                                                                                lastMonthPoints={pointGroupData.lastMonthPoints || 0}
                                                                                                                rank={index}
                                                                                                                rankChange={pointGroupData.lastMonthRank - pointGroupData.rank}
                                                                                                        />
                                                                                                )
                                                                                        })
                                                                                }
                                                                        </>
                                                                )
                                                        })
                                                }
                                        </div>
                                </div>
                                <div>
                                        <div className="grid my-5 gap-1" style={{
                                                gridTemplateColumns: `repeat(${globalDashData?.grades.length}, 1fr)`
                                        }}>
                                                {
                                                        globalDashData?.grades.sort((a, b) => a - b).map(grade => (
                                                                <div key={grade} className="text-xl border flex justify-center" style={{
                                                                        background: metalStyle('#000'),
                                                                        backgroundSize: "cover",
                                                                        backgroundPosition: "center",
                                                                        //backgroundPositionX: `${(Math.random() * 20) - 40}em`,
                                                                        textShadow: metalTextShadow
                                                                }}>Grade {grade}</div>
                                                        ))
                                                }
                                                {
                                                        globalDashData?.grades.sort((a, b) => a - b).map(grade => (
                                                                <div className="grid grid-cols-1 gap-1">{
                                                                        [...Array(10)].map((_, index) => {
                                                                                const student = globalDashData.students.filter(student => student.grade === grade).sort((a, b) => b.totalPoints - a.totalPoints)[index]
                                                                                return (
                                                                                                student !== undefined ? <StudentPointTile
                                                                                                        key={grade + ":" + index}
                                                                                                        fullName={student.firstName + " " + student.lastName}
                                                                                                        points={student.totalPoints || 0}
                                                                                                        lastMonthPoints={student.lastMonthPoints || 0}
                                                                                                        rank={index}
                                                                                                        rankChange={student.lastMonthGradeRank - student.gradeRank}
                                                                                                /> : <EmptyStudentPointTile />
                                                                                        )
                                                                        })}
                                                                </div>
                                                        ))
                                                }
                                        </div>
                                </div>
                        </div>
                        <div className="grid">
                                <div className="text-4xl border-b mb-1 flex justify-center items-center pt-5">Monthly Trends</div>
                                <div className="border rounded-xl p-5 grid">
                                        <div>
                                                <div className="text-xl border-b mb-1 flex justify-center">Most Points</div>
                                                {
                                                        globalDashData?.students
                                                        .sort((a, b) => b.monthToMonthChange - a.monthToMonthChange)
                                                        .slice(0, 10)
                                                        .map(student => (
                                                                <div key={student.id} className="text-lg border grid py-1 px-2 mx-2 my-1" style={{
                                                                        background: metalStyle('#000'),
                                                                        backgroundSize: "cover",
                                                                        backgroundPosition: "center",
                                                                        //backgroundPositionX: `${(Math.random() * 20) - 40}em`,
                                                                        gridTemplateColumns: "3fr 1fr",
                                                                        textShadow: metalTextShadow,
                                                                        textWrap: "nowrap"
                                                                }}>
                                                                        <div className="flex justify-start">
                                                                                {student.firstName + " " + student.lastName}
                                                                        </div>
                                                                        <div className="flex justify-end text-green-500">
                                                                                +{(student.monthToMonthChange).toLocaleString()}pts
                                                                        </div>
                                                                </div>
                                                        ))
                                                }
                                        </div>
                                        <div>
                                                <div className="text-xl border-b mb-1 flex justify-center">Most Improved Rank</div>
                                                {
                                                        globalDashData?.students
                                                        .sort((a, b) => (a.rank - a.lastMonthRank) - (b.rank - b.lastMonthRank))
                                                        .filter(student => student.lastMonthRank - student.rank > 0)
                                                        .slice(0, 10)
                                                        .map(student => (
                                                                <div key={student.id} className="text-lg border grid py-1 px-2 mx-2 my-1" style={{
                                                                        background: metalStyle('#000'),
                                                                        backgroundSize: "cover",
                                                                        backgroundPosition: "center",
                                                                        //backgroundPositionX: `${(Math.random() * 20) - 40}em`,
                                                                        gridTemplateColumns: "3fr 1fr",
                                                                        textShadow: metalTextShadow,
                                                                        textWrap: "nowrap"
                                                                }}>
                                                                        <div className="flex justify-start">
                                                                                {student.firstName + " " + student.lastName}
                                                                        </div>
                                                                        <div className="flex justify-end text-green-500">
                                                                                +{student.lastMonthRank - student.rank}
                                                                        </div>
                                                                </div>
                                                        ))
                                                }
                                        </div>
                                </div>
                        </div>
                </div>
        );
}
