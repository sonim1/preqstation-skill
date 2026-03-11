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

const PREQ_TASK_STATUSES = ["inbox", "todo", "hold", "ready", "done", "archived"];
const TASK_STATUS_ONLY_STATUSES = ["inbox", "todo", "hold", "ready", "done", "archived"];
const PREQ_ENGINES = ["claude-code", "codex", "gemini-cli"];
const PREQ_ENGINE_SET = new Set(PREQ_ENGINES);
let detectedClientEngine = null;

function normalizeEngineValue(input) {
  const value = typeof input === "string" ? input.trim().toLowerCase() : "";
  if (!value) return null;
  return PREQ_ENGINE_SET.has(value) ? value : null;
}

function inferEngineFromClientInfo(clientInfo) {
  const rawName = typeof clientInfo?.name === "string" ? clientInfo.name : "";
  const name = rawName.trim().toLowerCase();
  if (!name) return null;
  if (name.includes("claude")) return "claude-code";
  if (name.includes("gemini")) return "gemini-cli";
  if (name.includes("codex") || name.includes("openai") || name.includes("chatgpt")) return "codex";
  return null;
}

const PREQ_DEFAULT_ENGINE_RAW = (process.env.PREQSTATION_ENGINE || "").trim();
const PREQ_DEFAULT_ENGINE = PREQ_DEFAULT_ENGINE_RAW
  ? normalizeEngineValue(PREQ_DEFAULT_ENGINE_RAW)
  : "codex";
if (PREQ_DEFAULT_ENGINE_RAW && !PREQ_DEFAULT_ENGINE) {
  console.error("PREQSTATION_ENGINE must be one of: claude-code, codex, gemini-cli.");
  process.exit(1);
}

function resolveEngine(primary, fallback) {
  return (
    normalizeEngineValue(primary) ||
    normalizeEngineValue(fallback) ||
    detectedClientEngine ||
    PREQ_DEFAULT_ENGINE
  );
}

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
    run_state: task?.run_state ?? null,
    run_state_updated_at: task?.run_state_updated_at ?? null,
    priority: task?.priority ?? null,
    repo: task?.repo ?? null,
    engine: task?.engine ?? null,
    labels: Array.isArray(task?.labels) ? task.labels : [],
    updated_at: task?.updated_at ?? null
  };
}

function normalizeProjectKey(input) {
  const normalized = input.trim().toUpperCase();
  if (!normalized) {
    throw new Error("projectKey is required.");
  }
  if (!/^[A-Z0-9][A-Z0-9_-]{0,19}$/.test(normalized)) {
    throw new Error("projectKey must use letters/numbers/underscore/hyphen and be 1-20 chars.");
  }
  return normalized;
}

function getTaskKey(task) {
  const taskKey = typeof task?.task_key === "string" ? task.task_key.trim() : "";
  if (taskKey) return taskKey;
  const id = typeof task?.id === "string" ? task.id.trim() : "";
  return id;
}

function belongsToProjectKey(task, projectKey) {
  const taskKey = getTaskKey(task).toUpperCase();
  return taskKey.startsWith(`${projectKey}-`);
}

const server = new McpServer({
  name: "preqstation-mcp",
  version: "1.0.0"
});
server.server.oninitialized = () => {
  const clientInfo = server.server.getClientVersion();
  detectedClientEngine = inferEngineFromClientInfo(clientInfo);
};

// ── preq_list_tasks ──────────────────────────────────────────────────────────
server.registerTool(
  "preq_list_tasks",
  {
    title: "List PREQSTATION tasks",
    description: "List PREQSTATION tasks by status/label/engine. Use this when no ticket number is provided and you need to pick work.",
    inputSchema: {
      status: z.enum(PREQ_TASK_STATUSES).optional(),
      label: z.string().trim().min(1).max(40).optional(),
      projectKey: z.string().trim().min(1).max(20).optional(),
      engine: z.enum(PREQ_ENGINES).optional().describe("Filter tasks by engine (claude-code, codex, gemini-cli). Use your own engine value."),
      limit: z.number().int().min(1).max(200).optional()
    }
  },
  async ({ status, label, projectKey, engine, limit }) => {
    const resolvedEngine = resolveEngine(engine);
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    if (label) query.set("label", label);
    query.set("engine", resolvedEngine);
    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    const result = await preqRequest(`/api/tasks${suffix}`);
    const tasks = Array.isArray(result.tasks) ? result.tasks : [];
    const normalizedProjectKey = projectKey ? normalizeProjectKey(projectKey) : null;
    const filtered = normalizedProjectKey ? tasks.filter((task) => belongsToProjectKey(task, normalizedProjectKey)) : tasks;
    const sliced = limit ? filtered.slice(0, limit) : filtered;

    return contentText({
      count: sliced.length,
      total: filtered.length,
      total_api_tasks: tasks.length,
      project_key: normalizedProjectKey,
      tasks: sliced.map(summarizeTask)
    });
  }
);

// ── preq_get_task ────────────────────────────────────────────────────────────
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

// ── preq_get_project_settings ────────────────────────────────────────────────
server.registerTool(
  "preq_get_project_settings",
  {
    title: "Get PREQSTATION project settings",
    description:
      "Get project settings by project key (deploy_strategy/deploy_default_branch/deploy_auto_pr/deploy_commit_on_review/deploy_squash_merge).",
    inputSchema: {
      projectKey: z.string().trim().min(1).max(20),
    },
  },
  async ({ projectKey }) => {
    const normalizedProjectKey = normalizeProjectKey(projectKey);
    const result = await preqRequest(
      `/api/projects/${encodeURIComponent(normalizedProjectKey)}/settings`,
    );
    return contentText({
      project_key: normalizedProjectKey,
      settings: result?.settings || {},
    });
  },
);

// ── preq_plan_task ───────────────────────────────────────────────────────────
server.registerTool(
  "preq_plan_task",
  {
    title: "Plan task and move to Todo",
    description:
      "Improve an existing project task by uploading generated plan content and moving the card to todo. Use after reading local code and generating plan with LLM.",
    inputSchema: {
      projectKey: z.string().trim().min(1).max(20),
      taskId: z.string().trim().min(1),
      planMarkdown: z.string().trim().min(1).max(50000),
      acceptanceCriteria: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
      priority: z.enum(["highest", "high", "medium", "none", "low", "lowest"]).optional(),
      labels: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
      engine: z.enum(PREQ_ENGINES).optional().describe("Assign executing engine (claude-code, codex, gemini-cli).")
    }
  },
  async ({ projectKey, taskId, planMarkdown, acceptanceCriteria, priority, labels, engine }) => {
    const normalizedProjectKey = normalizeProjectKey(projectKey);
    const found = await preqRequest(`/api/tasks/${encodeTaskId(taskId)}`);
    const task = found.task || found;
    const resolvedEngine = resolveEngine(engine, task?.engine);

    if (!belongsToProjectKey(task, normalizedProjectKey)) {
      throw new Error(`Task ${taskId} does not belong to project key ${normalizedProjectKey}.`);
    }

    const payload = {
      planMarkdown,
      status: "todo",
      engine: resolvedEngine,
      run_state: null,
      ...(acceptanceCriteria ? { acceptance_criteria: acceptanceCriteria } : {}),
      ...(priority ? { priority } : {}),
      ...(labels ? { labels } : {})
    };

    const result = await preqRequest(`/api/tasks/${encodeTaskId(taskId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });

    return contentText({
      task: result.task || null,
      project_key: normalizedProjectKey,
      requested_status: "todo",
      requested_run_state: null,
      plan_updated: true
    });
  }
);

// ── preq_create_task ─────────────────────────────────────────────────────────
server.registerTool(
  "preq_create_task",
  {
    title: "Create PREQSTATION task (Inbox)",
    description:
      "Create a new PREQSTATION task and place it in Inbox. This uses /api/tasks and omits status so server default maps to internal inbox.",
    inputSchema: {
      title: z.string().trim().min(1).max(180),
      repo: z.string().trim().min(1).max(2000),
      description: z.string().trim().max(50000).optional(),
      priority: z.enum(["highest", "high", "medium", "none", "low", "lowest"]).optional(),
      labels: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
      acceptanceCriteria: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
      branch: z.string().trim().max(200).optional(),
      assignee: z.string().trim().max(120).optional(),
      engine: z.enum(PREQ_ENGINES).optional().describe("Assign executing engine (claude-code, codex, gemini-cli).")
    }
  },
  async ({ title, repo, description, priority, labels, acceptanceCriteria, branch, assignee, engine }) => {
    const resolvedEngine = resolveEngine(engine);
    const payload = {
      title,
      repo,
      description: description || "",
      engine: resolvedEngine,
      priority: priority || "none",
      ...(labels ? { labels } : {}),
      ...(acceptanceCriteria ? { acceptance_criteria: acceptanceCriteria } : {}),
      ...(branch ? { branch } : {}),
      ...(assignee ? { assignee } : {})
    };

    const result = await preqRequest("/api/tasks", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    return contentText({
      task: result.task || null,
      requested_status: "inbox"
    });
  }
);

// ── preq_start_task ──────────────────────────────────────────────────────────
server.registerTool(
  "preq_start_task",
  {
    title: "Start PREQSTATION task",
    description: "Claim task execution and mark run_state=working before any substantive work.",
    inputSchema: {
      taskId: z.string().trim().min(1),
      engine: z.enum(PREQ_ENGINES).optional().describe("Engine claiming this task (claude-code, codex, gemini-cli).")
    }
  },
  async ({ taskId, engine }) => {
    const existing = await preqRequest(`/api/tasks/${encodeTaskId(taskId)}`);
    const existingTask = existing.task || existing;
    const currentStatus = typeof existingTask?.status === "string" ? existingTask.status.trim() : "";
    if (currentStatus === "done" || currentStatus === "archived") {
      throw new Error(
        `Task ${taskId} is already terminal (${currentStatus}) and cannot be claimed for execution.`
      );
    }

    const resolvedEngine = resolveEngine(engine, existingTask?.engine);
    const payload = {
      engine: resolvedEngine,
      run_state: "working"
    };

    const result = await preqRequest(`/api/tasks/${encodeTaskId(taskId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    return contentText({
      task: result.task || null,
      requested_run_state: "working"
    });
  }
);

// ── preq_update_task_status ──────────────────────────────────────────────────
server.registerTool(
  "preq_update_task_status",
  {
    title: "Update PREQSTATION task status only",
    description: "Update only task status via the status-only endpoint.",
    inputSchema: {
      taskId: z.string().trim().min(1),
      status: z.enum(TASK_STATUS_ONLY_STATUSES),
      engine: z.enum(PREQ_ENGINES).optional().describe("Engine updating this task status (claude-code, codex, gemini-cli).")
    }
  },
  async ({ taskId, status, engine }) => {
    const existing = await preqRequest(`/api/tasks/${encodeTaskId(taskId)}`);
    const existingTask = existing.task || existing;
    const resolvedEngine = resolveEngine(engine, existingTask?.engine);
    const payload = {
      status,
      ...(resolvedEngine ? { engine: resolvedEngine } : {})
    };

    const result = await preqRequest(`/api/tasks/${encodeTaskId(taskId)}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    return contentText(result);
  }
);

// ── preq_complete_task ───────────────────────────────────────────────────────
server.registerTool(
  "preq_complete_task",
  {
    title: "Submit PREQSTATION task as ready",
    description:
      "After work is done, upload execution result, move task to ready, and clear run_state. Result is saved into PREQSTATION work logs for verification.",
    inputSchema: {
      taskId: z.string().trim().min(1),
      summary: z.string().trim().min(1).max(4000),
      tests: z.string().trim().max(4000).optional(),
      prUrl: z.string().trim().url().optional(),
      notes: z.string().trim().max(8000).optional(),
      branchName: z.string().trim().max(200).optional(),
      engine: z.enum(PREQ_ENGINES).optional().describe("Engine that executed this task (claude-code, codex, gemini-cli).")
    }
  },
  async ({ taskId, summary, tests, prUrl, notes, branchName, engine }) => {
    const existing = await preqRequest(`/api/tasks/${encodeTaskId(taskId)}`);
    const existingTask = existing.task || existing;
    const currentStatus = typeof existingTask?.status === "string" ? existingTask.status.trim() : "";
    if (currentStatus !== "todo" && currentStatus !== "hold") {
      throw new Error(
        `Task ${taskId} must be in todo or hold before moving to ready. Current status: ${currentStatus || "unknown"}.`
      );
    }

    const resolvedEngine = resolveEngine(engine, existingTask?.engine);
    const resolvedBranchName =
      (typeof branchName === "string" ? branchName.trim() : "") ||
      (typeof existingTask?.branch === "string" ? existingTask.branch.trim() : "");

    const resultPayload = {
      summary,
      tests: tests || "",
      pr_url: prUrl || "",
      notes: notes || "",
      ...(resolvedBranchName ? { branch: resolvedBranchName } : {}),
      engine: resolvedEngine,
      completed_at: new Date().toISOString()
    };

    const result = await preqRequest(`/api/tasks/${encodeTaskId(taskId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "ready",
        run_state: null,
        result: resultPayload,
        ...(resolvedBranchName ? { branch: resolvedBranchName } : {}),
        ...(resolvedEngine ? { engine: resolvedEngine } : {})
      })
    });

    return contentText({
      task: result.task || null,
      requested_status: "ready",
      requested_run_state: null,
      uploaded_result: resultPayload
    });
  }
);

// ── preq_review_task ─────────────────────────────────────────────────────────
server.registerTool(
  "preq_review_task",
  {
    title: "Review PREQSTATION task",
    description:
      "Verify completed work and move task from ready to done. Run verification (tests, build, lint) before calling this tool. On verification failure, use preq_block_task instead.",
    inputSchema: {
      taskId: z.string().trim().min(1),
      summary: z.string().trim().min(1).max(4000).optional(),
      engine: z.enum(PREQ_ENGINES).optional().describe("Engine running verification (claude-code, codex, gemini-cli).")
    }
  },
  async ({ taskId, summary, engine }) => {
    const existing = await preqRequest(`/api/tasks/${encodeTaskId(taskId)}`);
    const existingTask = existing.task || existing;
    const currentStatus = typeof existingTask?.status === "string" ? existingTask.status.trim() : "";
    if (currentStatus !== "ready") {
      throw new Error(
        `Task ${taskId} must be in ready before moving to done. Current status: ${currentStatus || "unknown"}.`
      );
    }

    const resolvedEngine = resolveEngine(engine, existingTask?.engine);

    const resultPayload = {
      summary: summary || "All checks passed",
      engine: resolvedEngine,
      verified_at: new Date().toISOString()
    };

    const result = await preqRequest(`/api/tasks/${encodeTaskId(taskId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "done",
        run_state: null,
        result: resultPayload,
        ...(resolvedEngine ? { engine: resolvedEngine } : {})
      })
    });

    return contentText({
      task: result.task || null,
      uploaded_result: resultPayload
    });
  }
);

// ── preq_delete_task ─────────────────────────────────────────────────────────
server.registerTool(
  "preq_delete_task",
  {
    title: "Delete PREQSTATION task",
    description: "Permanently delete a task by ticket number or UUID.",
    inputSchema: {
      taskId: z.string().trim().min(1)
    }
  },
  async ({ taskId }) => {
    await preqRequest(`/api/tasks/${encodeTaskId(taskId)}`, {
      method: "DELETE"
    });
    return contentText({ deleted: true, taskId });
  }
);

// ── preq_block_task ──────────────────────────────────────────────────────────
server.registerTool(
  "preq_block_task",
  {
    title: "Block PREQSTATION task",
    description: "Move task to hold, clear run_state, and upload blocking reason.",
    inputSchema: {
      taskId: z.string().trim().min(1),
      reason: z.string().trim().min(1).max(4000),
      engine: z.enum(PREQ_ENGINES).optional().describe("Engine reporting the block (claude-code, codex, gemini-cli).")
    }
  },
  async ({ taskId, reason, engine }) => {
    const resolvedEngine = resolveEngine(engine);
    const resultPayload = {
      reason,
      engine: resolvedEngine,
      blocked_at: new Date().toISOString()
    };

    const result = await preqRequest(`/api/tasks/${encodeTaskId(taskId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "hold",
        run_state: null,
        result: resultPayload,
        engine: resolvedEngine
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
