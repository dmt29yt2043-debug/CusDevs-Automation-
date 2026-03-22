import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-8">
          <Link href="/admin/projects" className="font-semibold text-gray-900">
            UX Research
          </Link>
          <div className="flex gap-6 text-sm">
            <Link href="/admin/projects" className="text-gray-600 hover:text-gray-900">
              Projects
            </Link>
            <Link href="/admin/scenarios" className="text-gray-600 hover:text-gray-900">
              Scenarios
            </Link>
            <Link href="/admin/sessions" className="text-gray-600 hover:text-gray-900">
              Sessions
            </Link>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
