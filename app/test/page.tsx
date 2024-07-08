"use client";
import { useEffect } from "react";
import { clientGetStudentGroup } from "../supaApi/client/admin/studentGroups/adminStudentGroupsApi";

export default function TestPage() {

    async function test() {
        clientGetStudentGroup(1).then((data) => {
            console.log(data);
        });
    }

    useEffect(() => {
        test();
    }, []);

    return (
        <div>
            <h1 className="text-4xl">Test Page</h1>
            <p className="text-lg">This is a test page.</p>
        </div>
    );
}