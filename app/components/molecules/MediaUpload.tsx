/**
 * @layer molecule
 * @description Self-contained media upload zone with local file upload and
 *   three cloud picker integrations: Google Photos, Google Drive, Dropbox.
 *   Renders a drop/click zone, three subtle provider pills underneath,
 *   and a thumbnail gallery with remove buttons.
 * @consumes media, onMediaChange
 * @emits onMediaChange (updated media array)
 */

import { useRef, useCallback, useEffect } from "react";
import { MediaThumb } from "../atoms/MediaThumb.js";
import type { MediaItem } from "~/lib/types.js";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type MediaUploadProps = {
  media: MediaItem[];
  onMediaChange: (media: MediaItem[]) => void;
};

// ---------------------------------------------------------------------------
// Cloud provider config (keys come from env / window at runtime)
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    Dropbox?: {
      choose: (opts: {
        success: (files: DropboxFile[]) => void;
        cancel?: () => void;
        linkType: "direct" | "preview";
        multiselect: boolean;
        extensions: string[];
      }) => void;
      isBrowserSupported?: () => boolean;
    };
    google?: {
      accounts?: {
        oauth2: {
          initTokenClient: (opts: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
      picker?: {
        PickerBuilder: new () => GooglePickerBuilder;
        ViewId: { DOCS: string };
        Feature: { MULTISELECT_ENABLED: string; NAV_HIDDEN: string };
        Action: { PICKED: string; CANCEL: string };
        Response: { ACTION: string; DOCUMENTS: string };
        Document: {
          ID: string;
          NAME: string;
          URL: string;
          MIME_TYPE: string;
        };
      };
    };
    gapi?: {
      load: (api: string, cb: () => void) => void;
    };
  }
}

type DropboxFile = {
  id: string;
  name: string;
  link: string;
  bytes: number;
  icon: string;
  thumbnailLink?: string;
  isDir: boolean;
};

type GooglePickerBuilder = {
  addView: (viewId: string) => GooglePickerBuilder;
  enableFeature: (feature: string) => GooglePickerBuilder;
  setOAuthToken: (token: string) => GooglePickerBuilder;
  setDeveloperKey: (key: string) => GooglePickerBuilder;
  setAppId: (id: string) => GooglePickerBuilder;
  setCallback: (cb: (data: Record<string, unknown>) => void) => GooglePickerBuilder;
  build: () => { setVisible: (v: boolean) => void };
};

// ---------------------------------------------------------------------------
// Script loader helper
// ---------------------------------------------------------------------------

const loadedScripts = new Set<string>();

function loadScript(
  src: string,
  attrs?: Record<string, string>,
): Promise<void> {
  if (loadedScripts.has(src)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      loadedScripts.add(src);
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) script.setAttribute(k, v);
    }
    script.onload = () => {
      loadedScripts.add(src);
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MediaUpload({ media, onMediaChange }: MediaUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null!);

  // ---- Local file upload ----
  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const formData = new FormData();
      for (const file of Array.from(files)) {
        formData.append("file", file);
      }
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          onMediaChange([...media, ...data.items]);
        }
      } catch {
        // Upload failed silently; user can retry
      }
    },
    [media, onMediaChange],
  );

  const removeMedia = useCallback(
    (index: number) => {
      onMediaChange(media.filter((_, i) => i !== index));
    },
    [media, onMediaChange],
  );

  // ---- Google Photos Picker (server-driven) ----
  const handleGooglePhotos = useCallback(async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn("VITE_GOOGLE_CLIENT_ID not set");
      return;
    }

    await loadScript("https://accounts.google.com/gsi/client");

    const tokenClient = window.google!.accounts!.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/photospicker.mediaitems.readonly",
      callback: async (resp) => {
        if (resp.error || !resp.access_token) return;
        const accessToken = resp.access_token;

        try {
          // 1. Create session
          const sessionRes = await fetch("/api/cloud-picker", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: "google-photos",
              action: "create-session",
              accessToken,
            }),
          });
          const session = await sessionRes.json();
          if (!session.id) return;

          // 2. Open picker in new window
          const pickerUrl = session.pickerUri + "/autoclose";
          const pickerWin = window.open(pickerUrl, "_blank", "width=900,height=600");

          // 3. Poll until media selected or timeout
          const pollInterval = session.pollingConfig?.pollInterval
            ? parseInt(session.pollingConfig.pollInterval, 10) * 1000
            : 2000;
          const timeout = session.pollingConfig?.timeoutIn
            ? parseInt(session.pollingConfig.timeoutIn, 10) * 1000
            : 30000;
          const deadline = Date.now() + timeout;

          const poll = async (): Promise<void> => {
            if (Date.now() > deadline) return;
            const pollRes = await fetch("/api/cloud-picker", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                provider: "google-photos",
                action: "poll",
                accessToken,
                sessionId: session.id,
              }),
            });
            const pollData = await pollRes.json();
            if (pollData.mediaItemsSet) {
              // 4. Get media items
              const itemsRes = await fetch("/api/cloud-picker", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  provider: "google-photos",
                  action: "media-items",
                  accessToken,
                  sessionId: session.id,
                }),
              });
              const itemsData = await itemsRes.json();
              const newItems: MediaItem[] = (
                itemsData.mediaItems ?? []
              ).map(
                (item: {
                  type: string;
                  mediaFile: { baseUrl: string; filename: string };
                }) => ({
                  type: item.type === "video" ? "video" : ("img" as const),
                  src: item.mediaFile.baseUrl + "=w800",
                  alt: item.mediaFile.filename,
                }),
              );
              if (newItems.length > 0) {
                onMediaChange([...media, ...newItems]);
              }
              pickerWin?.close();
              return;
            }
            await new Promise((r) => setTimeout(r, pollInterval));
            return poll();
          };

          await poll();
        } catch (err) {
          console.error("Google Photos picker error:", err);
        }
      },
    });
    tokenClient.requestAccessToken();
  }, [media, onMediaChange]);

  // ---- Google Drive Picker (client-side overlay) ----
  const handleGoogleDrive = useCallback(async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    const appId = import.meta.env.VITE_GOOGLE_APP_ID;
    if (!clientId || !apiKey) {
      console.warn("VITE_GOOGLE_CLIENT_ID or VITE_GOOGLE_API_KEY not set");
      return;
    }

    await Promise.all([
      loadScript("https://apis.google.com/js/api.js"),
      loadScript("https://accounts.google.com/gsi/client"),
    ]);

    // Load picker API
    await new Promise<void>((resolve) => {
      window.gapi!.load("picker", resolve);
    });

    // Get OAuth token
    const tokenClient = window.google!.accounts!.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: (resp) => {
        if (resp.error || !resp.access_token) return;
        const accessToken = resp.access_token;
        const picker = window.google!.picker!;

        const p = new picker.PickerBuilder()
          .addView(picker.ViewId.DOCS)
          .enableFeature(picker.Feature.MULTISELECT_ENABLED)
          .setOAuthToken(accessToken)
          .setDeveloperKey(apiKey)
          .setAppId(appId ?? "")
          .setCallback(async (data: Record<string, unknown>) => {
            if (data[picker.Response.ACTION] !== picker.Action.PICKED) return;
            const docs = data[picker.Response.DOCUMENTS] as Record<
              string,
              string
            >[];

            for (const doc of docs) {
              const fileId = doc[picker.Document.ID];
              const fileName = doc[picker.Document.NAME];
              try {
                const res = await fetch("/api/cloud-picker", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    provider: "google-drive",
                    fileId,
                    fileName,
                    accessToken,
                  }),
                });
                if (res.ok) {
                  const result = await res.json();
                  onMediaChange([...media, ...result.items]);
                }
              } catch (err) {
                console.error("Drive download error:", err);
              }
            }
          })
          .build();
        p.setVisible(true);
      },
    });
    tokenClient.requestAccessToken();
  }, [media, onMediaChange]);

  // ---- Dropbox Chooser (fully client-side) ----
  const handleDropbox = useCallback(async () => {
    const appKey = import.meta.env.VITE_DROPBOX_APP_KEY;
    if (!appKey) {
      console.warn("VITE_DROPBOX_APP_KEY not set");
      return;
    }

    await loadScript("https://www.dropbox.com/static/api/2/dropins.js", {
      id: "dropboxjs",
      "data-app-key": appKey,
    });

    window.Dropbox!.choose({
      success: async (files) => {
        const newItems: MediaItem[] = files
          .filter((f) => !f.isDir)
          .map((f) => {
            const isVideo = /\.(mp4|webm|mov)$/i.test(f.name);
            return {
              type: isVideo ? "video" : ("img" as const),
              src: f.link,
              alt: f.name,
            };
          });
        if (newItems.length > 0) {
          onMediaChange([...media, ...newItems]);
        }
      },
      linkType: "direct",
      multiselect: true,
      extensions: [
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".webp",
        ".svg",
        ".mp4",
        ".webm",
        ".mov",
      ],
    });
  }, [media, onMediaChange]);

  // ---- Preload Dropbox script on mount for faster opens ----
  useEffect(() => {
    const appKey = import.meta.env.VITE_DROPBOX_APP_KEY;
    if (appKey) {
      loadScript("https://www.dropbox.com/static/api/2/dropins.js", {
        id: "dropboxjs",
        "data-app-key": appKey,
      }).catch(() => {});
    }
  }, []);

  // ---- Render ----
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-zinc-400">Media</span>

      {/* Drop / click zone */}
      <div
        className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-zinc-700 py-4 text-xs text-zinc-500 hover:border-zinc-500"
        onClick={() => fileInputRef.current?.click()}
      >
        Drop files or click to upload
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      {/* Cloud provider pills */}
      <div className="flex gap-2 pt-0.5">
        <CloudPill label="Google Photos" onClick={handleGooglePhotos} />
        <CloudPill label="Drive" onClick={handleGoogleDrive} />
        <CloudPill label="Dropbox" onClick={handleDropbox} />
      </div>

      {/* Media gallery */}
      {media.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-2">
          {media.map((m, i) => (
            <div key={i} className="relative">
              <MediaThumb src={m.src} alt={m.alt} type={m.type} />
              <button
                type="button"
                onClick={() => removeMedia(i)}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 text-[10px] text-zinc-300 hover:bg-zinc-600"
                aria-label="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CloudPill — subtle provider button
// ---------------------------------------------------------------------------

function CloudPill({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClick();
      }}
      className="rounded-md border border-zinc-700 bg-transparent px-2.5 py-1 text-[10px] text-zinc-500 transition-colors duration-200 hover:border-zinc-400 hover:text-zinc-300"
    >
      {label}
    </button>
  );
}
