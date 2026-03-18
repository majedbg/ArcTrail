/**
 * AI Route — POST handler for all three AI modes.
 *
 * - narrator / graph-qa: streams response as text/event-stream (SSE)
 * - snapshot-advisor: returns structured JSON (no streaming)
 *
 * API key is server-side only — NEVER exposed to client.
 */

import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// System prompts (from spec §13)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPTS: Record<string, string> = {
  narrator: `You are a design historian for ArcTrail, a knowledge graph for design processes. Given the artifact data below, narrate its evolution as engaging prose. Highlight what changed, what was learned, and why decisions were made. Be specific and technical where the data supports it. Write in plain paragraphs — no markdown headers. Reference specific entry dates and changes.`,

  "snapshot-advisor": `You are a semantic versioning assistant for ArcTrail.
Version string grammar:
SUBSYSTEM_CODE.FEATURE_CODEiteration[fork_suffix][.COMPONENT_MAJOR.COMPONENT_MINOR] per subsystem, segments separated by hyphens.

Rules:
- Component/variation changed → componentMinor++, ITERATES_ON
- Component swapped → componentMajor++, ITERATES_ON
- Feature iterated (same concept) → iteration++, ITERATES_ON
- Feature replaced (new concept) → new FEATURE_CODE, reset iteration to 1, FORKS_FROM
- Subsystem added → append new segment, ITERATES_ON
- Subsystem swapped → new subsystemCode, FORKS_FROM
- Parallel forks at same parent+iteration → append a/b/c suffix, FORKS_FROM

A prior algorithmic analysis is provided as context. You may agree with it or refine it based on the artifact descriptions and design intent.

Respond with valid JSON only:
{
  "versionString": "string",
  "reasoning": "string",
  "relationType": "ITERATES_ON" | "FORKS_FROM"
}`,

  "graph-qa": `You are an expert on this ArcTrail design project. Answer questions about its artifacts, evolution, decisions, and relationships. Be specific — reference artifact names, version strings, entry dates, and stage progression where relevant. If asked to summarize the project, describe the concept, its prototypes, subsystems, and how they have evolved.`,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AIRequestBody = {
  mode: "narrator" | "snapshot-advisor" | "graph-qa";
  context: unknown;
  messages: { role: "user" | "assistant"; content: string }[];
  userMessage: string;
};

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    throw new Response("Method not allowed", { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "sk-ant-...") {
    return json(
      { error: "AI unavailable — check ANTHROPIC_API_KEY" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as AIRequestBody;
  const { mode, context, messages, userMessage } = body;

  if (!mode || !SYSTEM_PROMPTS[mode]) {
    return json({ error: "Invalid mode" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  const systemPrompt = SYSTEM_PROMPTS[mode];

  // Build messages array: context as first user message, then conversation history, then new message
  const contextStr =
    typeof context === "string"
      ? context
      : JSON.stringify(context, null, 2);

  const anthropicMessages: Anthropic.MessageParam[] = [
    { role: "user", content: `Context:\n${contextStr}` },
    { role: "assistant", content: "I've reviewed the context. How can I help?" },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  // --- snapshot-advisor: non-streaming JSON response ---
  if (mode === "snapshot-advisor") {
    try {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: anthropicMessages,
      });

      const text =
        response.content[0]?.type === "text" ? response.content[0].text : "";

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return json({ error: "AI did not return valid JSON", raw: text }, { status: 500 });
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (
        !parsed.versionString ||
        !parsed.reasoning ||
        !parsed.relationType
      ) {
        return json(
          { error: "AI response missing required fields", raw: text },
          { status: 500 },
        );
      }

      return json(parsed);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown AI error";
      return json({ error: message }, { status: 500 });
    }
  }

  // --- narrator / graph-qa: streaming SSE ---
  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const chunk = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`;
              controller.enqueue(encoder.encode(chunk));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Stream error";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: msg })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown AI error";
    return json({ error: message }, { status: 500 });
  }
}
