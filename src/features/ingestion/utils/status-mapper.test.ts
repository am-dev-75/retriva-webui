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

import { describe, it, expect } from 'vitest';
import { mapSourceStatus, getStatusBadgeClass } from './status-mapper';

describe('status-mapper', () => {
  describe('mapSourceStatus', () => {
    it('maps known statuses to human readable text', () => {
      expect(mapSourceStatus('CREATED')).toBe('Configured');
      expect(mapSourceStatus('BASELINE_RUNNING')).toBe('Initial indexing');
      expect(mapSourceStatus('ACTIVE')).toBe('Active');
      expect(mapSourceStatus('FAILED')).toBe('Failed');
    });

    it('returns the raw string if not found', () => {
      expect(mapSourceStatus('UNKNOWN_STATUS')).toBe('UNKNOWN_STATUS');
    });
  });

  describe('getStatusBadgeClass', () => {
    it('maps statuses to the correct CSS class', () => {
      expect(getStatusBadgeClass('ACTIVE')).toBe('active');
      expect(getStatusBadgeClass('BASELINE_RUNNING')).toBe('syncing');
      expect(getStatusBadgeClass('PAUSED')).toBe('paused');
      expect(getStatusBadgeClass('FAILED')).toBe('error');
    });
  });
});
