import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => [
  { title: "ArcTrail — Map your creative evolution" },
  {
    name: "description",
    content:
      "Document your design process as a living knowledge graph. Every iteration, every decision, every version — connected.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center">
        <h1 className="text-6xl font-bold tracking-tight text-zinc-50 sm:text-7xl">
          ArcTrail
        </h1>
        <p className="mt-4 text-xl text-zinc-300 sm:text-2xl">
          Map your creative evolution.
        </p>
        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-zinc-400">
          Document your design process as a living knowledge graph. Every
          iteration, every decision, every version — connected.
        </p>
        <div className="mt-10">
          <Link
            to="/app"
            className="inline-flex items-center rounded-lg bg-zinc-100 px-6 py-3 text-base font-semibold text-zinc-900 transition-colors hover:bg-white"
          >
            Open App
          </Link>
        </div>
      </div>
    </div>
  );
}
