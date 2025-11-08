import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { getProjectBySlug } from "~/lib/utils.server";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const projectId = params.projectId;
  if (!projectId) {
    return json({ error: "Project ID required" }, { status: 400 });
  }

  const project = await getProjectBySlug(projectId);
  if (!project) {
    return json({ error: "Project not found" }, { status: 404 });
  }

  // Add CORS headers for embed access
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET");
  headers.set("Content-Type", "application/json");

  return json(project, { headers });
}

