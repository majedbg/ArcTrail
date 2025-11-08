import { Form } from "@remix-run/react";
import { useEffect, useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import type { IterationNode, MediaItem } from "~/lib/types";
import { MediaThumb } from "./MediaThumb";

interface NodeFormProps {
  node?: IterationNode | null;
  projectId: string;
  onCancel: () => void;
}

export function NodeForm({ node, projectId, onCancel }: NodeFormProps) {
  const [activeTab, setActiveTab] = useState<"details" | "markdown">("details");
  const [contentMd, setContentMd] = useState<string>(node?.contentMd ?? "");
  const [showBoth, setShowBoth] = useState<boolean>(node?.showBoth ?? false);
  const [mediaDraft, setMediaDraft] = useState<MediaItem[]>(node?.media ?? []);

  // If existing node has MD, show markdown tab initially
  useEffect(() => {
    if (node?.contentMd && node.contentMd.trim().length > 0) {
      setActiveTab("markdown");
    }
  }, [node]);

  async function handleFiles(files: FileList | File[]) {
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("file", f));

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const items: MediaItem[] = await res.json();
      setMediaDraft((curr) => [...curr, ...items]);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload files");
    }
  }

  function removeMedia(index: number) {
    setMediaDraft((curr) => curr.filter((_, i) => i !== index));
  }

  const isEditing = !!node;

  return (
    <Form
      method="post"
      replace
      encType="application/x-www-form-urlencoded"
      className="space-y-4"
    >
      <input type="hidden" name="intent" value={isEditing ? "updateNode" : "createNode"} />
      {isEditing && <input type="hidden" name="nodeId" value={node.id} />}
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="mediaJson" value={JSON.stringify(mediaDraft)} />
      <input type="hidden" name="contentMd" value={contentMd} />
      <input type="hidden" name="contentFormat" value={contentMd.trim() ? "md" : ""} />
      <input type="hidden" name="showBoth" value={showBoth ? "1" : "0"} />

      {/* Tab headers */}
      <div className="flex gap-2 border-b pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("details")}
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
            activeTab === "details"
              ? "bg-black text-white"
              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("markdown")}
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
            activeTab === "markdown"
              ? "bg-black text-white"
              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          Markdown
        </button>
      </div>

      {activeTab === "details" ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title *</label>
            <input
              type="text"
              name="title"
              defaultValue={node?.title}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Date *</label>
            <input
              type="date"
              name="dateISO"
              defaultValue={node?.dateISO}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Categories</label>
            <input
              type="text"
              name="categories"
              defaultValue={node?.categories.join(", ")}
              placeholder="digital, physical, circuit"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Comma-separated list (e.g., digital, physical, circuit)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Summary</label>
            <textarea
              name="summary"
              defaultValue={node?.summary}
              rows={4}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Media</label>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => {
                if (e.target.files) {
                  handleFiles(e.target.files);
                }
              }}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
            />
            {mediaDraft.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {mediaDraft.map((item, idx) => (
                  <div key={idx} className="relative rounded border">
                    <MediaThumb media={item} className="h-24 w-full" />
                    <button
                      type="button"
                      onClick={() => removeMedia(idx)}
                      className="absolute right-1 top-1 rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500">
            Tip: If you also write Markdown, it will take precedence unless you tick "Show both".
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Markdown Content</label>
            <div data-color-mode="light" className="mt-1">
              <MDEditor
                value={contentMd}
                onChange={(value) => setContentMd(value ?? "")}
                height={320}
                preview="edit"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showBoth}
              onChange={(e) => setShowBoth(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Show both (add tabs in view mode)
          </label>
          <p className="text-xs text-gray-500">
            When Markdown is provided, it takes precedence over Details, unless you tick "Show
            both".
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          {isEditing ? "Save" : "Create node"}
        </button>
      </div>
    </Form>
  );
}

