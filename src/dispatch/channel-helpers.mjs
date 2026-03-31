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

function deriveProjectKey(taskKey) {
  const normalized = normalizeString(taskKey).toUpperCase();
  const [projectKey = ''] = normalized.split('-', 1);
  return projectKey;
}

function describeQueueEligibility(task, inflightTaskKeys = new Set()) {
  const taskKey = normalizeString(task?.task_key || task?.taskKey || task?.id);
  if (!taskKey) {
    return { taskKey: null, eligible: false, reason: 'missing-task-key' };
  }

  if (inflightTaskKeys.has(taskKey)) {
    return { taskKey, eligible: false, reason: 'already-inflight' };
  }

  const status = normalizeString(task?.status).toLowerCase();
  if (status !== 'todo') {
    return { taskKey, eligible: false, reason: `status=${status || 'missing'}` };
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

export function selectQueuedTasks(tasks, inflightTaskKeys = new Set()) {
  return tasks.filter((task) => describeQueueEligibility(task, inflightTaskKeys).eligible);
}

export function summarizeQueuedTaskSelection(tasks, inflightTaskKeys = new Set()) {
  return tasks.map((task) => describeQueueEligibility(task, inflightTaskKeys));
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
      task_key: taskKey,
      project_key: projectKey,
      action,
      engine,
      branch_name: branchName,
      source: 'preq_dispatch_channel',
    },
  };
}
