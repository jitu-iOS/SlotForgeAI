import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d0d14] text-white px-6 text-center">
      <p className="text-7xl font-black text-indigo-600 mb-4">404</p>
      <h1 className="text-2xl font-bold mb-2">Page not found</h1>
      <p className="text-zinc-500 text-sm mb-8">
        This page doesn't exist or was moved.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors px-6 py-3 text-sm font-semibold"
      >
        ← Back to SlotForge AI - Internal
      </Link>
    </div>
  );
}
