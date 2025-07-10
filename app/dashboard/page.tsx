import { Quicksand } from "next/font/google";
import Link from "next/link"

// Force static generation to reduce serverless functions
export const dynamic = 'force-static';

const customFont = Quicksand({
  weight: "400",
  subsets: ["latin"]
});

export default function Dashboard() {

  const DashboardTile = ({
    title,
    desc,
    endpoint
  }: {
    title: String,
    desc: String,
    endpoint: String
  }) => (
    <div className="w-full bg-slate-300 dark:bg-slate-700 px-10 py-5 my-5 hover:shadow-lg">
      <Link
        href={`/dashboard/${endpoint}`}>
        <div className="text-4xl">{title}</div>
        <div className="text-2xl">{desc}</div>
      </Link>
    </div >
  )

  return (
    <div className={`w-full ${customFont.className} px-5`}>
      <DashboardTile title="Global" desc="A large, all encompassing dashboard" endpoint="global" />
      <DashboardTile title="Featured" desc="A more detailed, multi-page dashboard that transitions between screens" endpoint="featured" />
    </div>
  )
}
