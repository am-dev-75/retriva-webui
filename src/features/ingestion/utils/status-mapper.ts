export const mapSourceStatus = (status: string): string => {
  const map: Record<string, string> = {
    CREATED: 'Configured',
    VALIDATING_CONNECTION: 'Validating connection',
    BASELINE_PENDING: 'Waiting for initial indexing',
    BASELINE_RUNNING: 'Initial indexing',
    CATCHUP_RUNNING: 'Catching up',
    ACTIVE: 'Active',
    PAUSED: 'Paused',
    DEGRADED: 'Degraded',
    FAILED: 'Failed',
    DELETING: 'Disconnecting',
    DELETED: 'Deleted'
  };

  return map[status] || status;
};

export const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'ACTIVE':
    case 'CATCHUP_RUNNING':
      return 'active';
    case 'BASELINE_RUNNING':
    case 'VALIDATING_CONNECTION':
      return 'syncing';
    case 'PAUSED':
    case 'CREATED':
    case 'BASELINE_PENDING':
      return 'paused';
    case 'FAILED':
    case 'DEGRADED':
    case 'DELETING':
    case 'DELETED':
      return 'error';
    default:
      return '';
  }
};
