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

export function selectQueuedTasks(tasks, inflightTaskKeys = new Set()) {
  return tasks.filter((task) => {
    const taskKey = normalizeString(task?.task_key || task?.taskKey || task?.id);
    if (!taskKey) return false;
    if (inflightTaskKeys.has(taskKey)) return false;

    const status = normalizeString(task?.status).toLowerCase();
    const runState = normalizeString(task?.run_state || task?.runState).toLowerCase();
    const dispatchTarget = normalizeDispatchTarget(task?.dispatch_target || task?.dispatchTarget);

    return (
      status === 'todo' &&
      runState === 'queued' &&
      dispatchTarget === 'claude-code-channel'
    );
  });
}

export function buildQueuedTaskChannelEvent(task) {
  const taskKey = normalizeString(task?.task_key || task?.taskKey || task?.id).toUpperCase();
  const status = normalizeString(task?.status).toLowerCase();
  const engine = normalizeString(task?.engine).toLowerCase() || 'claude-code';
  const branchName = normalizeString(task?.branch_name || task?.branchName);
  const projectKey = deriveProjectKey(taskKey);

  return {
    content: `Dispatch queued PREQ task ${taskKey}.`,
    meta: {
      task_key: taskKey,
      project_key: projectKey,
      action: STATUS_ACTION_MAP[status] || 'implement',
      engine,
      branch_name: branchName,
      source: 'preq_dispatch_channel',
    },
  };
}
