import { json, redirect } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form, Link } from "@remix-run/react";
import { prisma } from "../lib/db.server.js";

export async function loader(_args: LoaderFunctionArgs) {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { artifacts: true } },
    },
  });
  return json({ projects });
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "createProject") {
    const title = form.get("title");
    if (typeof title !== "string" || title.trim().length === 0) {
      return json({ error: "Title is required" }, { status: 400 });
    }

    // Generate unique slug from title (kebab-case)
    const baseSlug = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    let slug = baseSlug;
    let suffix = 1;
    while (await prisma.project.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    const project = await prisma.project.create({
      data: { title: title.trim(), slug },
    });

    return redirect(`/app/${project.slug}`);
  }

  return json({ error: "Unknown intent" }, { status: 400 });
}

export default function AppIndex() {
  const { projects } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Projects</h1>
      </div>

      {projects.length === 0 ? (
        <p className="mt-8 text-zinc-500">No projects yet. Create your first.</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/app/${project.slug}`}
              className="group rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 transition-colors hover:border-zinc-600 hover:bg-zinc-800/80"
            >
              <h2 className="text-lg font-semibold text-zinc-100 group-hover:text-white">
                {project.title}
              </h2>
              {project.summary && (
                <p className="mt-1 text-sm text-zinc-400 line-clamp-2">
                  {project.summary}
                </p>
              )}
              <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500">
                <span>{project._count.artifacts} artifacts</span>
                <span>
                  Updated{" "}
                  {new Date(project.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Form method="post" className="mt-8 flex gap-2">
        <input type="hidden" name="intent" value="createProject" />
        <input
          name="title"
          placeholder="Project title"
          className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
          required
        />
        <button
          type="submit"
          className="rounded bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
        >
          New Project
        </button>
      </Form>
    </div>
  );
}
