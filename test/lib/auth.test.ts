import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * lib/auth.ts builds a real better-auth instance (which itself opens the
 * database) as a module-level side effect. These mocks stand in for the
 * external library, next/headers and next/navigation so the tests exercise
 * only the guard logic this app actually wrote: getCurrentUser, requireUser
 * and requireApiUser.
 */
const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));

vi.mock('better-auth', () => ({
  betterAuth: vi.fn(() => ({ api: { getSession: getSessionMock } })),
}));

vi.mock('better-auth/next-js', () => ({
  nextCookies: vi.fn(() => ({})),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    // The real redirect() signals control flow by throwing; mirror that so
    // callers that rely on "nothing after redirect() runs" behave the same way.
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(() => ({})),
}));

// react's cache() assumes a per-request Server Component scope, which does not
// exist in a plain test run; make it transparent so mock return values aren't
// memoized across tests.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, cache: (fn: unknown) => fn };
});

const { getCurrentUser, requireApiUser, requireUser } = await import('@/lib/auth');
const { redirect } = await import('next/navigation');

const fakeUser = { id: 'user-1', email: 'a@example.com' };

beforeEach(() => {
  getSessionMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('getCurrentUser', () => {
  it('returns the session user when signed in', async () => {
    getSessionMock.mockResolvedValue({ user: fakeUser, session: {} });

    expect(await getCurrentUser()).toEqual(fakeUser);
  });

  it('returns null when there is no session', async () => {
    getSessionMock.mockResolvedValue(null);

    expect(await getCurrentUser()).toBeNull();
  });
});

describe('requireUser', () => {
  it('returns the user when signed in', async () => {
    getSessionMock.mockResolvedValue({ user: fakeUser, session: {} });

    expect(await requireUser('/notes/123')).toEqual(fakeUser);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('redirects to /authenticate with the current path when signed out', async () => {
    getSessionMock.mockResolvedValue(null);

    await expect(requireUser('/notes/123')).rejects.toThrow(
      'REDIRECT:/authenticate?next=%2Fnotes%2F123',
    );
  });
});

describe('requireApiUser', () => {
  it('returns the user when signed in', async () => {
    getSessionMock.mockResolvedValue({ user: fakeUser, session: {} });

    expect(await requireApiUser()).toEqual(fakeUser);
  });

  it('returns a 401 JSON response when signed out', async () => {
    getSessionMock.mockResolvedValue(null);

    const result = await requireApiUser();

    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
  });
});
