import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import {
  unstable_parseMultipartFormData,
  unstable_createFileUploadHandler,
} from "@remix-run/node";
import path from "node:path";
import { randomUUID } from "node:crypto";

// TODO: Swap writeFile to S3/R2 SDK upload here.
// Replace src with CDN URL from upload response.

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    throw new Response("Method not allowed", { status: 405 });
  }

  const uploadDir = path.resolve("public/uploads");

  const uploadHandler = unstable_createFileUploadHandler({
    directory: uploadDir,
    maxPartSize: MAX_FILE_SIZE,
    file: ({ filename }) => {
      const ext = filename ? path.extname(filename) : "";
      return `${randomUUID()}${ext}`;
    },
  });

  let formData: FormData;
  try {
    formData = await unstable_parseMultipartFormData(request, uploadHandler);
  } catch {
    return json({ error: "File too large (max 10MB)" }, { status: 413 });
  }

  const files = formData.getAll("file");
  const items: { type: "img" | "video"; src: string; alt: string }[] = [];

  for (const file of files) {
    if (!(file instanceof File)) continue;

    if (!ALLOWED_TYPES.has(file.type)) {
      return json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 415 },
      );
    }

    const isVideo = file.type.startsWith("video/");
    items.push({
      type: isVideo ? "video" : "img",
      src: `/uploads/${file.name}`,
      alt: file.name,
    });
  }

  return json({ items });
}
