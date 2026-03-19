/**
 * Server-side proxy for cloud storage picker integrations that need OAuth or
 * cannot run entirely in the browser.
 *
 * When a user clicks one of the cloud-provider pills in the MediaUpload
 * component, the client obtains an OAuth token via Google Identity Services
 * (or, for Dropbox, uses the fully client-side Chooser and never hits this
 * route at all). The client then calls this endpoint to perform the
 * privileged work that must happen server-side:
 *
 *   Google Photos — The Photos Picker API is a server-driven REST flow.
 *     The client creates a picker session here, opens the Google-hosted
 *     picker UI in a popup, and polls this route until the user finishes
 *     selecting. Once selection is confirmed, this route fetches the list
 *     of picked media items and returns their URLs to the client.
 *
 *   Google Drive — The picker overlay itself is client-side JavaScript, but
 *     downloading the actual file bytes requires an authenticated Drive API
 *     call. The client sends the file ID and OAuth token here; this route
 *     streams the file from Drive, writes it to /public/uploads/ with a
 *     UUID filename, and returns the local path so it can be treated like
 *     any other uploaded media item.
 *
 *   Dropbox — Entirely client-side (Chooser SDK). Does not use this route.
 *
 * POST /api/cloud-picker
 *   body: { provider: "google-photos", action: "create-session" | "poll" | "media-items", accessToken, sessionId? }
 *        | { provider: "google-drive", fileId, fileName, accessToken }
 */

import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";

const GOOGLE_PHOTOS_BASE = "https://photospicker.googleapis.com/v1";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    throw new Response("Method not allowed", { status: 405 });
  }

  const body = await request.json();
  const { provider } = body;

  // -----------------------------------------------------------------------
  // Google Photos Picker (server-driven REST API)
  // -----------------------------------------------------------------------
  if (provider === "google-photos") {
    const accessToken = body.accessToken as string | undefined;
    if (!accessToken) {
      return json({ error: "Missing accessToken" }, { status: 400 });
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    if (body.action === "create-session") {
      const res = await fetch(`${GOOGLE_PHOTOS_BASE}/sessions`, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.text();
        return json({ error: err }, { status: res.status });
      }
      return json(await res.json());
    }

    if (body.action === "poll") {
      const { sessionId } = body;
      if (!sessionId) {
        return json({ error: "Missing sessionId" }, { status: 400 });
      }
      const res = await fetch(
        `${GOOGLE_PHOTOS_BASE}/sessions/${sessionId}`,
        { headers },
      );
      if (!res.ok) {
        const err = await res.text();
        return json({ error: err }, { status: res.status });
      }
      return json(await res.json());
    }

    if (body.action === "media-items") {
      const { sessionId } = body;
      if (!sessionId) {
        return json({ error: "Missing sessionId" }, { status: 400 });
      }
      const res = await fetch(
        `${GOOGLE_PHOTOS_BASE}/mediaItems?sessionId=${sessionId}`,
        { headers },
      );
      if (!res.ok) {
        const err = await res.text();
        return json({ error: err }, { status: res.status });
      }
      return json(await res.json());
    }

    return json({ error: "Unknown action" }, { status: 400 });
  }

  // -----------------------------------------------------------------------
  // Google Drive — proxy file download (picker is client-side, but download
  // needs the OAuth token, so we proxy through here to save to /uploads)
  // -----------------------------------------------------------------------
  if (provider === "google-drive") {
    const { fileId, accessToken, fileName } = body;
    if (!fileId || !accessToken) {
      return json(
        { error: "Missing fileId or accessToken" },
        { status: 400 },
      );
    }
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) {
      const err = await res.text();
      return json({ error: err }, { status: res.status });
    }
    const contentType = res.headers.get("content-type") ?? "";
    const isVideo = contentType.startsWith("video/");
    const ext = fileName
      ? "." + (fileName as string).split(".").pop()
      : "";
    const { randomUUID } = await import("node:crypto");
    const { writeFile, mkdir } = await import("node:fs/promises");
    const path = await import("node:path");
    const uploadDir = path.resolve("public/uploads");
    await mkdir(uploadDir, { recursive: true });
    const storedName = `${randomUUID()}${ext}`;
    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(path.join(uploadDir, storedName), buffer);

    return json({
      items: [
        {
          type: isVideo ? "video" : ("img" as const),
          src: `/uploads/${storedName}`,
          alt: (fileName as string) || storedName,
        },
      ],
    });
  }

  return json({ error: "Unknown provider" }, { status: 400 });
}
