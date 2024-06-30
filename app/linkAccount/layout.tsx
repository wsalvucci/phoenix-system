export default function LinkAccountLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-1">
            <div className="flex justify-center">Link Your Account</div>
            {children}
        </div>
    )
}