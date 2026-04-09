const STATUS_ACTION_MAP = {
  inbox: 'plan',
  todo: 'implement',
  hold: 'implement',
  ready: 'review',
  done: 'status',
  archived: 'status',
};

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeDispatchTarget(value) {
  const normalized = normalizeString(value).toLowerCase();
  return normalized || null;
}

function normalizeScope(value) {
  const normalized = normalizeString(value).toLowerCase();
  return normalized || null;
}

function deriveProjectKey(taskKey) {
  const normalized = normalizeString(taskKey).toUpperCase();
  const [projectKey = ''] = normalized.split('-', 1);
  return projectKey;
}

function describeQueueEligibility(task, inflightTaskKeys = new Set(), reservedTaskKeys = new Set()) {
  const taskKey = normalizeString(task?.task_key || task?.taskKey || task?.id);
  if (!taskKey) {
    return { taskKey: null, eligible: false, reason: 'missing-task-key' };
  }

  if (inflightTaskKeys.has(taskKey)) {
    return { taskKey, eligible: false, reason: 'already-inflight' };
  }

  if (reservedTaskKeys.has(taskKey)) {
    return { taskKey, eligible: false, reason: 'request-backed' };
  }

  const runState = normalizeString(task?.run_state || task?.runState).toLowerCase();
  if (runState !== 'queued') {
    return { taskKey, eligible: false, reason: `run_state=${runState || 'missing'}` };
  }

  const dispatchTarget = normalizeDispatchTarget(task?.dispatch_target || task?.dispatchTarget);
  if (dispatchTarget !== 'claude-code-channel') {
    return {
      taskKey,
      eligible: false,
      reason: `dispatch_target=${dispatchTarget || 'missing'}`,
    };
  }

  return { taskKey, eligible: true, reason: 'eligible' };
}

export function selectQueuedTasks(tasks, inflightTaskKeys = new Set(), reservedTaskKeys = new Set()) {
  return tasks.filter((task) =>
    describeQueueEligibility(task, inflightTaskKeys, reservedTaskKeys).eligible,
  );
}

export function summarizeQueuedTaskSelection(
  tasks,
  inflightTaskKeys = new Set(),
  reservedTaskKeys = new Set(),
) {
  return tasks.map((task) => describeQueueEligibility(task, inflightTaskKeys, reservedTaskKeys));
}

export function buildQueuedTaskChannelEvent(task) {
  const taskKey = normalizeString(task?.task_key || task?.taskKey || task?.id).toUpperCase();
  const status = normalizeString(task?.status).toLowerCase();
  const engine = normalizeString(task?.engine).toLowerCase() || 'claude-code';
  const branchName = normalizeString(task?.branch_name || task?.branchName);
  const projectKey = deriveProjectKey(taskKey);
  const action = STATUS_ACTION_MAP[status] || 'implement';

  const instructions = [
    `Dispatch queued PREQ task ${taskKey}.`,
    'Call dispatch_task exactly once with these arguments:',
    `task_key="${taskKey}"`,
    `project_key="${projectKey}"`,
    `action="${action}"`,
    `engine="${engine}"`,
  ];

  if (branchName) {
    instructions.push(`branch_name="${branchName}"`);
  }

  instructions.push('Do not implement the task in this dispatcher session.');

  return {
    content: instructions.join(' '),
    meta: {
      scope: 'task',
      task_key: taskKey,
      project_key: projectKey,
      action,
      engine,
      branch_name: branchName,
      source: 'preq_dispatch_channel',
    },
  };
}

function describeDispatchRequestEligibility(request, inflightRequestIds = new Set()) {
  const requestId = normalizeString(request?.id);
  if (!requestId) {
    return { requestId: null, eligible: false, reason: 'missing-request-id' };
  }

  if (inflightRequestIds.has(`dispatch-request:${requestId}`)) {
    return { requestId, eligible: false, reason: 'already-inflight' };
  }

  const state = normalizeString(request?.state).toLowerCase();
  if (state !== 'queued') {
    return { requestId, eligible: false, reason: `state=${state || 'missing'}` };
  }

  const dispatchTarget = normalizeDispatchTarget(request?.dispatch_target || request?.dispatchTarget);
  if (dispatchTarget !== 'claude-code-channel') {
    return {
      requestId,
      eligible: false,
      reason: `dispatch_target=${dispatchTarget || 'missing'}`,
    };
  }

  return { requestId, eligible: true, reason: 'eligible' };
}

export function selectQueuedDispatchRequests(requests, inflightRequestIds = new Set()) {
  return requests.filter((request) =>
    describeDispatchRequestEligibility(request, inflightRequestIds).eligible,
  );
}

export function summarizeQueuedDispatchRequestSelection(requests, inflightRequestIds = new Set()) {
  return requests.map((request) =>
    describeDispatchRequestEligibility(request, inflightRequestIds),
  );
}

export function collectReservedTaskKeysFromDispatchRequests(
  requests,
  inflightRequestIds = new Set(),
) {
  const reserved = new Set();

  for (const request of selectQueuedDispatchRequests(requests, inflightRequestIds)) {
    if (normalizeScope(request?.scope) !== 'task') {
      continue;
    }

    const taskKey = normalizeString(request?.task_key || request?.taskKey).toUpperCase();
    if (taskKey) {
      reserved.add(taskKey);
    }
  }

  return reserved;
}

export function buildDispatchRequestChannelEvent(request) {
  const requestId = normalizeString(request?.id);
  const scope = normalizeScope(request?.scope) || 'task';
  const taskKey = normalizeString(request?.task_key || request?.taskKey).toUpperCase();
  const projectKey = normalizeString(request?.project_key || request?.projectKey).toUpperCase();
  const action = normalizeString(request?.objective || request?.action).toLowerCase() || 'implement';
  const engine = normalizeString(request?.engine).toLowerCase() || 'claude-code';
  const branchName = normalizeString(request?.branch_name || request?.branchName);
  const promptMetadata = request?.prompt_metadata || request?.promptMetadata || {};
  const askHint = normalizeString(promptMetadata?.askHint);
  const insightPromptB64 = normalizeString(promptMetadata?.insightPromptB64);

  const instructions = [
    `Dispatch queued PREQ request ${requestId}.`,
    'Call dispatch_task exactly once with these arguments:',
    `scope="${scope}"`,
    `project_key="${projectKey}"`,
    `action="${action}"`,
    `engine="${engine}"`,
    `dispatch_request_id="${requestId}"`,
  ];

  if (taskKey) {
    instructions.push(`task_key="${taskKey}"`);
  }

  if (branchName) {
    instructions.push(`branch_name="${branchName}"`);
  }

  if (askHint) {
    instructions.push(`ask_hint="${askHint}"`);
  }

  if (insightPromptB64) {
    instructions.push(`insight_prompt_b64="${insightPromptB64}"`);
  }

  instructions.push('Do not implement the task in this dispatcher session.');

  return {
    content: instructions.join(' '),
    meta: {
      scope,
      dispatch_request_id: requestId,
      task_key: taskKey || null,
      project_key: projectKey,
      action,
      engine,
      branch_name: branchName || null,
      ask_hint: askHint || null,
      insight_prompt_b64: insightPromptB64 || null,
      source: 'preq_dispatch_channel',
    },
  };
}
