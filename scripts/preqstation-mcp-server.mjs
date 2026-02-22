#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

function normalizeApiUrl(input) {
  const raw = input.trim();
  if (!raw) {
    throw new Error("PREQSTATION MCP server requires PREQSTATION_API_URL.");
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("PREQSTATION_API_URL must be a valid URL.");
  }

  // Security: require TLS for remote endpoints. Allow plain HTTP only for localhost development.
  const isLocalhost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
  const isHttps = parsed.protocol === "https:";
  const isLocalHttp = isLocalhost && parsed.protocol === "http:";

  if (!isHttps && !isLocalHttp) {
    throw new Error("PREQSTATION_API_URL must use https:// (or http://localhost for local development).");
  }

  return parsed.toString().replace(/\/$/, "");
}

const PREQSTATION_TOKEN = (process.env.PREQSTATION_TOKEN || "").trim();
if (!PREQSTATION_TOKEN) {
  console.error("PREQSTATION MCP server requires PREQSTATION_TOKEN.");
  process.exit(1);
}

let PREQSTATION_API_URL = "";
try {
  PREQSTATION_API_URL = normalizeApiUrl(process.env.PREQSTATION_API_URL || "");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid PREQSTATION_API_URL.");
  process.exit(1);
}

const PREQ_TASK_STATUSES = ["todo", "in_progress", "review", "done", "blocked"];

function encodeTaskId(taskId) {
  return encodeURIComponent(taskId.trim());
}

function toJsonText(value) {
  return JSON.stringify(value, null, 2);
}

async function preqRequest(path, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${PREQSTATION_TOKEN}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${PREQSTATION_API_URL}${path}`, {
    ...init,
    headers
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    // Security: avoid leaking raw upstream error bodies that may contain sensitive server details.
    throw new Error(`PREQSTATION API request failed with status ${response.status}.`);
  }

  return payload || {};
}

function contentText(value) {
  return {
    content: [
      {
        type: "text",
        text: typeof value === "string" ? value : toJsonText(value)
      }
    ]
  };
}

function summarizeTask(task) {
  return {
    id: task?.id ?? null,
    title: task?.title ?? null,
    status: task?.status ?? null,
    priority: task?.priority ?? null,
    repo: task?.repo ?? null,
    labels: Array.isArray(task?.labels) ? task.labels : [],
    updated_at: task?.updated_at ?? null
  };
}

const server = new McpServer({
  name: "preqstation-mcp",
  version: "1.0.0"
});

server.registerTool(
  "preq_list_tasks",
  {
    title: "List PREQSTATION tasks",
    description: "List PREQSTATION tasks by status/label. Use this when no ticket number is provided and you need to pick work.",
    inputSchema: {
      status: z.enum(PREQ_TASK_STATUSES).optional(),
      label: z.string().trim().min(1).max(40).optional(),
      limit: z.number().int().min(1).max(200).optional()
    }
  },
  async ({ status, label, limit }) => {
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    if (label) query.set("label", label);
    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    const result = await preqRequest(`/api/tasks${suffix}`);
    const tasks = Array.isArray(result.tasks) ? result.tasks : [];
    const sliced = limit ? tasks.slice(0, limit) : tasks;

    return contentText({
      count: sliced.length,
      total: tasks.length,
      tasks: sliced.map(summarizeTask)
    });
  }
);

server.registerTool(
  "preq_get_task",
  {
    title: "Get PREQSTATION task",
    description: "Get detailed task payload by ticket number like TEST-4 or UUID.",
    inputSchema: {
      taskId: z.string().trim().min(1)
    }
  },
  async ({ taskId }) => {
    const result = await preqRequest(`/api/tasks/${encodeTaskId(taskId)}`);
    return contentText(result);
  }
);

server.registerTool(
  "preq_start_task",
  {
    title: "Start PREQSTATION task",
    description: "Move task to in_progress by ticket number.",
    inputSchema: {
      taskId: z.string().trim().min(1)
    }
  },
  async ({ taskId }) => {
    const result = await preqRequest(`/api/tasks/${encodeTaskId(taskId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "in_progress"
      })
    });
    return contentText(result);
  }
);

server.registerTool(
  "preq_complete_task",
  {
    title: "Submit PREQSTATION task for review",
    description:
      "Upload execution result to a task and mark status as review (In Review). Result is saved into PREQSTATION work logs for verification.",
    inputSchema: {
      taskId: z.string().trim().min(1),
      summary: z.string().trim().min(1).max(4000),
      tests: z.string().trim().max(4000).optional(),
      prUrl: z.string().trim().url().optional(),
      notes: z.string().trim().max(8000).optional()
    }
  },
  async ({ taskId, summary, tests, prUrl, notes }) => {
    const resultPayload = {
      summary,
      tests: tests || "",
      pr_url: prUrl || "",
      notes: notes || "",
      completed_at: new Date().toISOString()
    };

    const result = await preqRequest(`/api/tasks/${encodeTaskId(taskId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "review",
        result: resultPayload
      })
    });

    return contentText({
      task: result.task || null,
      uploaded_result: resultPayload
    });
  }
);

server.registerTool(
  "preq_block_task",
  {
    title: "Block PREQSTATION task",
    description: "Mark task as blocked and upload blocking reason.",
    inputSchema: {
      taskId: z.string().trim().min(1),
      reason: z.string().trim().min(1).max(4000)
    }
  },
  async ({ taskId, reason }) => {
    const resultPayload = {
      reason,
      blocked_at: new Date().toISOString()
    };

    const result = await preqRequest(`/api/tasks/${encodeTaskId(taskId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "blocked",
        result: resultPayload
      })
    });

    return contentText({
      task: result.task || null,
      uploaded_result: resultPayload
    });
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("PREQSTATION MCP server failed:", error);
  process.exit(1);
});
