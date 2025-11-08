import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import { listProjects, createProject } from "~/lib/utils.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const projects = await listProjects();
  return json({ projects });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const title = formData.get("title") as string;
  const slug = formData.get("slug") as string;

  if (!title || !slug) {
    return json({ error: "Title and slug are required" }, { status: 400 });
  }

  try {
    const project = await createProject({
      title,
      slug: slug.toLowerCase().replace(/\s+/g, "-"),
    });
    return json({ project, success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create project";
    return json({ error: message }, { status: 400 });
  }
}

export default function AppIndex() {
  const { projects } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  if (actionData?.success && actionData.project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold">Project created!</h2>
          <Link
            to={`/app/${actionData.project.id}`}
            className="text-blue-600 hover:underline"
          >
            Open project →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Projects</h1>

        <div className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Create New Project</h2>
          <Form method="post" className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                Slug (URL-friendly identifier)
              </label>
              <input
                type="text"
                id="slug"
                name="slug"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="my-project"
              />
            </div>
            {actionData?.error && (
              <div className="rounded bg-red-50 p-3 text-sm text-red-800">
                {actionData.error}
              </div>
            )}
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Create Project
            </button>
          </Form>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Existing Projects</h2>
          {projects.length === 0 ? (
            <p className="text-gray-500">No projects yet. Create one above!</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/app/${project.id}`}
                  className="block rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <h3 className="text-lg font-semibold text-gray-900">{project.title}</h3>
                  {project.summary && (
                    <p className="mt-1 text-sm text-gray-600">{project.summary}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    Updated {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

