import { Link } from "@remix-run/react";

export default function Index() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="mb-6 text-6xl font-bold text-gray-900">
          Skill Tree
        </h1>
        <p className="mb-8 text-xl text-gray-600">
          Visualize the evolution of your design projects
        </p>
        <Link
          to="/app"
          className="inline-block rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow-lg transition-colors hover:bg-blue-700"
        >
          Create Project
        </Link>
      </div>
    </div>
  );
}

