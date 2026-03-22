import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold">UX Research Platform</h1>
        <p className="text-gray-600">Async usability testing MVP</p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/admin/projects"
            className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Admin Dashboard
          </Link>
          <Link
            href="/participant/pulsekids-research/welcome"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
          >
            Start Research (Demo)
          </Link>
        </div>
      </div>
    </div>
  );
}
