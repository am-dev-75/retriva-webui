import { describe, it, expect } from 'vitest';
import { formatFileSize } from './formatting';

describe('formatFileSize', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
  });

  it('handles fractional values', () => {
    expect(formatFileSize(1500)).toBe('1.5 KB');
  });
});
