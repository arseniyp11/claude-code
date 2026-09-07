import { afterEach, describe, expect, it, vi } from 'vitest';

import { reportError, withReference } from '@/lib/errors';

describe('reportError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs the context and error, and returns an 8-character reference id', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('boom');

    const reference = reportError('Failed to do the thing', error);

    expect(reference).toMatch(/^[0-9a-f]{8}$/);
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to do the thing'),
      error,
    );
    expect(consoleError.mock.calls[0]![0]).toContain(reference);
  });

  it('never leaks the raw error into its return value', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const reference = reportError('ctx', new Error('sensitive SQL details'));

    expect(reference).not.toContain('sensitive');
  });

  it('generates distinct reference ids across calls', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const a = reportError('ctx', new Error('a'));
    const b = reportError('ctx', new Error('b'));

    expect(a).not.toBe(b);
  });
});

describe('withReference', () => {
  it('appends the reference id to the message', () => {
    expect(withReference('Could not save the note.', 'abcd1234')).toBe(
      'Could not save the note. (reference: abcd1234)',
    );
  });
});
