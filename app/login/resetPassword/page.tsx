"use client";
import { SubmitButton } from "../submit-button";

// Force static generation to reduce serverless functions
export const dynamic = 'force-static';
import { createClient } from "../../../utils/supabase/client"
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

export default function ResetPassword() {

    const supabase = createClient();

    const [userData, setUserData] = useState<User | null>(null);

    useEffect(() => {
        console.log("Listening for password recovery events")
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Event:", event)
            if (event == "PASSWORD_RECOVERY") {
                const newPassword = prompt("What would you like your new password to be?");
                if (!newPassword) return;
                const { data, error } = await supabase.auth
                    .updateUser({ password: newPassword })

                if (data) alert("Password updated successfully!")
                if (error) alert("There was an error updating your password.")
            } else if (event == "SIGNED_IN") {
                supabase.auth.getUser().then(response => {
                    console.log("User:", response)
                    setUserData(response.data.user)
                })
            }
        })
    })

    const sendResetEmail = async (formData: FormData) => {
        const { data, error } = await supabase.auth.resetPasswordForEmail(
            formData.get("email") as string,
            {
                // Redirect back to here after password reset
                redirectTo: `${window.location.origin}/login/resetPassword`,
            }
        )

        if (error) {
            console.error(error)
            return
        }

        alert("Password reset email sent to: " + formData.get("email") + ". Please check your inbox.")
    }

    const changePassword = async (formData: FormData) => {
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (password !== confirmPassword) {
            alert("Passwords do not match.")
            return
        }

        const { data, error } = await supabase.auth.updateUser({
            password: password
        })

        if (error) {
            console.error(error)
            alert(error.message)
            return
        }

        console.log(data)

        alert("Password updated successfully!")

        window.location.href = "/"
    }

    const resetPassForm = () => {
        return (
            <form className="animate-in flex-1 flex flex-col w-full justify-center gap-2 text-foreground">
                <h1 className="text-2xl font-bold">Reset Password</h1>
                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    className="input dark:[color-scheme:dark]"
                />
                <SubmitButton
                    formAction={sendResetEmail}
                    className="border border-foreground/20 rounded-md px-4 py-2 text-foreground mb-2"
                    pendingText="Resetting Password..."
                >Reset Password</SubmitButton>
            </form>
        )
    }

    const changePassForm = () => {
        return (
            <form className="animate-in flex-1 flex flex-col w-full justify-center gap-2 text-foreground">
                <h1 className="text-2xl font-bold">Change Password</h1>
                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    className="input dark:[color-scheme:dark]"
                />
                <input
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirm Password"
                    className="input dark:[color-scheme:dark]"
                />
                <SubmitButton
                    formAction={changePassword}
                    className="border border-foreground/20 rounded-md px-4 py-2 text-foreground mb-2"
                    pendingText="Changing Password..."
                >Change Password</SubmitButton>
            </form>
        )
    }

    return (
        <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2">
            {userData ? changePassForm() : resetPassForm()}
        </div>
    )
}