import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { signInEmailMock, signUpEmailMock, signOutMock, redirectMock, isAPIErrorMock } = vi.hoisted(
  () => ({
    signInEmailMock: vi.fn(),
    signUpEmailMock: vi.fn(),
    signOutMock: vi.fn(),
    redirectMock: vi.fn((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    }),
    isAPIErrorMock: vi.fn(),
  }),
);

vi.mock('@/lib/auth', () => ({
  auth: {
    api: { signInEmail: signInEmailMock, signUpEmail: signUpEmailMock, signOut: signOutMock },
  },
}));
vi.mock('better-auth/api', () => ({ isAPIError: isAPIErrorMock }));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

const { signInAction, signOutAction, signUpAction } = await import('@/app/authenticate/actions');

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

function apiError(code: string) {
  const error = new Error(code) as Error & { body: { code: string } };
  error.body = { code };
  return error;
}

beforeEach(() => {
  signInEmailMock.mockReset();
  signUpEmailMock.mockReset();
  signOutMock.mockReset();
  isAPIErrorMock.mockReset().mockReturnValue(true);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('signInAction', () => {
  it('returns field errors for an invalid email without calling better-auth', async () => {
    const result = await signInAction({}, formData({ email: 'not-an-email', password: 'x' }));

    expect(result.fieldErrors?.email).toBeTruthy();
    expect(signInEmailMock).not.toHaveBeenCalled();
  });

  it('requires a non-empty password', async () => {
    const result = await signInAction({}, formData({ email: 'a@example.com', password: '' }));

    expect(result.fieldErrors?.password).toBeTruthy();
  });

  it('signs in and redirects to a sanitized next path', async () => {
    signInEmailMock.mockResolvedValue({});

    await expect(
      signInAction({}, formData({ email: 'a@example.com', password: 'secret', next: '/notes/1' })),
    ).rejects.toThrow('REDIRECT:/notes/1');

    expect(signInEmailMock).toHaveBeenCalledWith({
      body: { email: 'a@example.com', password: 'secret' },
      headers: expect.any(Headers),
    });
  });

  it('rejects an open-redirect next value and falls back to the default', async () => {
    signInEmailMock.mockResolvedValue({});

    await expect(
      signInAction(
        {},
        formData({ email: 'a@example.com', password: 'secret', next: '//evil.com' }),
      ),
    ).rejects.toThrow('REDIRECT:/dashboard');
  });

  it('collapses "no such user" and "wrong password" into one message', async () => {
    signInEmailMock.mockRejectedValue(apiError('INVALID_EMAIL_OR_PASSWORD'));

    const result = await signInAction({}, formData({ email: 'a@example.com', password: 'wrong' }));

    expect(result.error).toBe('Invalid email or password.');
    expect(result.email).toBe('a@example.com');
  });

  it('never echoes the password back in form state', async () => {
    signInEmailMock.mockRejectedValue(apiError('INVALID_EMAIL_OR_PASSWORD'));

    const result = await signInAction(
      {},
      formData({ email: 'a@example.com', password: 'super-secret-value' }),
    );

    expect(JSON.stringify(result)).not.toContain('super-secret-value');
  });

  it('gives a generic, reference-bearing message for a non-API error', async () => {
    isAPIErrorMock.mockReturnValue(false);
    signInEmailMock.mockRejectedValue(new Error('ECONNREFUSED to sqlite'));

    const result = await signInAction({}, formData({ email: 'a@example.com', password: 'x' }));

    expect(result.error).toMatch(
      /^Something went wrong\. Please try again\. \(reference: [0-9a-f]{8}\)$/,
    );
    expect(result.error).not.toContain('ECONNREFUSED');
  });
});

describe('signUpAction', () => {
  it('rejects a password under 8 characters', async () => {
    const result = await signUpAction({}, formData({ email: 'a@example.com', password: 'short' }));

    expect(result.fieldErrors?.password).toBe('Use at least 8 characters.');
    expect(signUpEmailMock).not.toHaveBeenCalled();
  });

  it('rejects a password over 128 characters', async () => {
    const result = await signUpAction(
      {},
      formData({ email: 'a@example.com', password: 'a'.repeat(129) }),
    );

    expect(result.fieldErrors?.password).toBe('Use at most 128 characters.');
  });

  it('signs up using the email as the display name, and redirects', async () => {
    signUpEmailMock.mockResolvedValue({});

    await expect(
      signUpAction({}, formData({ email: 'a@example.com', password: 'longenough' })),
    ).rejects.toThrow('REDIRECT:/dashboard');

    expect(signUpEmailMock).toHaveBeenCalledWith({
      body: { email: 'a@example.com', password: 'longenough', name: 'a@example.com' },
      headers: expect.any(Headers),
    });
  });

  it('does not reveal that the email is already registered', async () => {
    signUpEmailMock.mockRejectedValue(apiError('USER_ALREADY_EXISTS'));

    const result = await signUpAction(
      {},
      formData({ email: 'a@example.com', password: 'longenough' }),
    );

    expect(result.error).toBe(
      "We couldn't create that account. If you already have one, try signing in.",
    );
  });
});

describe('signOutAction', () => {
  it('signs out and redirects home', async () => {
    signOutMock.mockResolvedValue({});

    await expect(signOutAction()).rejects.toThrow('REDIRECT:/');
    expect(signOutMock).toHaveBeenCalled();
  });

  it('still redirects home when there is no session to end', async () => {
    signOutMock.mockRejectedValue(apiError('NO_SESSION'));

    await expect(signOutAction()).rejects.toThrow('REDIRECT:/');
  });
});
