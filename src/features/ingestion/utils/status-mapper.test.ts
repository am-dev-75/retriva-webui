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
