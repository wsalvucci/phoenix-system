"use client";
import { numberToOrdinal } from "@/app/dataClasses";
import { StudentPointsData, GlobalPoints } from "@/app/supaApi/universal/utils/types";
import Link from "next/link";
import { title } from "process";
import { useEffect, useState } from "react";

type SelectedStudentData = {
    id: number,
    name: string,
    totalPoints: number,
    pointsByCategory: {
        id: number,
        name: string,
        points: number
    }[]
}

export default function CompareContainer(
    {
        _studentData, _globalData
    } : {
        _studentData: StudentPointsData | null,
        _globalData: GlobalPoints | null
    }
) {
    
    const [globalData, setGlobalData] = useState<GlobalPoints | null>(null);

    const [thisStudent, setThisStudent] = useState<SelectedStudentData | null>(null)
    const [selectedGlobalStudent, setSelectedGlobalStudent] = useState<SelectedStudentData | null>(null)

    function globalStudentToData(id: number) {
        const student = globalData?.students.find(student => student.id === id)
        console.log(student)
        if (student === undefined) return null
        return {
            id: student.id,
            name: `${student.firstName} ${student.lastName}`,
            totalPoints: student.totalPoints,
            pointsByCategory: student.pointGroups.map(group => {
                return {
                    id: group.id,
                    name: "",
                    points: group.points
                }
            })
        }
    }

    useEffect(() => {
        setStudentData(_studentData)
        setGlobalData(_globalData)
        if (_studentData === null) return
        if (_globalData === null) return
        setThisStudent({
            id: _studentData.studentId,
            name: `${_studentData.firstName} ${_studentData.lastName}`,
            totalPoints: _studentData.totalPoints,
            pointsByCategory: _studentData.pointGroups.map(group => {
                return {
                    id: group.id,
                    name: group.name,
                    points: group.points
                }
            })
        })
    }, [])

    useEffect(() => {
        if (globalData === null) return
        console.log(globalData)
        setSelectedGlobalStudent(globalStudentToData(globalData.students[0].id))
    }, [globalData])
    
    if (thisStudent === null || selectedGlobalStudent === null) return <div>Loading...</div>

    return (
        <div className="grid grid-cols-1 m-3">
            <div className="bg-blue-500 text-white px-3 py-1 rounded-lg w-fit">
                <Link href="/student">Back</Link>
            </div>
            <div className="text-2xl">Select a student to compare with:</div>
            <select className="text-lg" onChange={(e) => {
                setSelectedGlobalStudent(globalStudentToData(parseInt(e.target.value)))
            }}>
                {
                    globalData?.students.slice(0,10).sort((a, b) => b.totalPoints - a.totalPoints).map((student, index) => {
                        return <option key={student.id} value={student.id}>{`${numberToOrdinal(index+1)} - ${student.firstName} ${student.lastName}`}</option>
                    })
                }
            </select>
            <div className="my-3" />
            <StringDetailsRow student1Data={thisStudent.name} student2Data={selectedGlobalStudent.name} />
            <DetailsRow categoryTitle="Total Points" student1Data={thisStudent.totalPoints} student2Data={selectedGlobalStudent.totalPoints} />
            {
                globalData?.pointGroups.map((group, index) => {
                    // copy new globalData and sort students by points in this category
                    const sortedStudents = globalData.students.sort((a, b) => (b.pointGroups.find(group => group.id === group.id)?.points ?? 0) - (a.pointGroups.find(group => group.id === group.id)?.points ?? 0))

                    return <DetailsRow
                        key={index}
                        categoryTitle={group.name}
                        student1DataRank={sortedStudents.findIndex(student => student.id === thisStudent.id)}
                        student1Data={thisStudent.pointsByCategory.find(category => category.id === group.id)?.points || 0}
                        student2DataRank={sortedStudents.findIndex(student => student.id === selectedGlobalStudent.id)}
                        student2Data={selectedGlobalStudent.pointsByCategory.find(category => category.id === group.id)?.points || 0}
                        />
                })
            }
        </div>
    )
}

function StringDetailsRow(
    {
        student1Data, student2Data
    } : {
        student1Data: string,
        student2Data: string
    }
) {
    return (
        <div className="grid grid-cols-3 text-2xl">
            <div className="text-start">{student1Data}</div>
            <div></div>
            <div className="text-end">{student2Data}</div>
        </div>
    )
}

function DetailsRow(
    {
        categoryTitle, student1DataRank, student1Data, student2DataRank, student2Data
    } : {
        categoryTitle: string,
        student1DataRank?: number,
        student1Data: number,
        student2DataRank?: number,
        student2Data: number
    }
) {
    const pct = student1Data / (student1Data + student2Data) * 100
    const diff = student1Data - student2Data
    return (
        <div className="w-full my-3">
            <div className="text-center text-xl">{categoryTitle}</div>
            <div className="grid grid-cols-3">
                <div>
                    {/* <div className="text-start text-lg">{numberToOrdinal(student1DataRank ?? 0)} place</div> */}
                    <div className="text-start text-2xl">{student1Data.toLocaleString()}</div>
                </div>
                <div className="text-center text-lg">{diff > 0 ? '+' : ''}{diff.toLocaleString()}</div>
                <div>
                    {/* <div className="text-end text-lg">{numberToOrdinal(student2DataRank ?? 0)} place</div> */}
                    <div className="text-end text-2xl">{student2Data.toLocaleString()}</div>
                </div>
            </div>
            <div className="w-full flex">
            <div className="rounded-full" style={{
                width: (pct-0.5) + '%',
                height: '0.5rem',
                background: '#f00'
            }} />
            <div style={{
                width: '1%',
                height: '0.5rem',
            }} />
            <div className="rounded-full" style={{
                width: ((100 - pct) - 0.5) + '%',
                height: '0.5rem',
                background: '#00f'
            }} />
            </div>
            {/* <div className="h-1 w-full" style={{
                background: `linear-gradient(to right, #f00 0%, #f00 ${pct}%, #00f ${pct}%, #00f 100%)`
            }}></div> */}
        </div>
    )
}