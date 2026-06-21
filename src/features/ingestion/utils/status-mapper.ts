/**
 * Copyright (C) 2026 Andrea Marson (am.dev.75@gmail.com)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
