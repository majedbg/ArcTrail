import { json, type ActionFunctionArgs } from "@remix-run/node";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { MediaItem } from "~/lib/types";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

/**
 * File upload endpoint
 * Accepts multipart/form-data with one or more files
 * Returns [{ src, type, alt }] array
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    const formData = await request.formData();
    const files = formData.getAll("file") as File[];

    if (files.length === 0) {
      return json({ error: "No files provided" }, { status: 400 });
    }

    const uploads: MediaItem[] = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;

      // Determine file type
      const mimeType = file.type;
      const isImage = mimeType.startsWith("image/");
      const isVideo = mimeType.startsWith("video/");

      if (!isImage && !isVideo) {
        continue; // Skip unsupported file types
      }

      // Generate unique filename
      const ext = file.name.split(".").pop() || "";
      const filename = `${randomUUID()}.${ext}`;
      const filepath = join(UPLOAD_DIR, filename);

      // Write file to disk
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await writeFile(filepath, buffer);

      // Create media item
      const mediaItem: MediaItem = {
        type: isImage ? "img" : "video",
        src: `/uploads/${filename}`,
        alt: file.name,
      };

      uploads.push(mediaItem);
    }

    if (uploads.length === 0) {
      return json({ error: "No valid files uploaded" }, { status: 400 });
    }

    return json(uploads);
  } catch (error) {
    console.error("Upload error:", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return json({ error: message }, { status: 500 });
  }
}

