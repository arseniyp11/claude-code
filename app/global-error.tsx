'use client';

/**
 * Last-resort error boundary, for failures in the root layout itself.
 *
 * This replaces the whole document, so it renders its own `<html>`/`<body>` and
 * cannot rely on the app's fonts, header or Tailwind tokens being in place —
 * hence the inline styles. Like `app/error.tsx`, it shows `error.digest` and
 * never `error.message`.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang='en'>
      <body
        style={{
          margin: 0,
          padding: '4rem 1.5rem',
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          lineHeight: 1.5,
        }}
      >
        <main style={{ maxWidth: '42rem', marginInline: 'auto' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Something went wrong</h1>

          <p style={{ marginTop: '0.75rem', color: '#5f5f5f' }}>
            The app failed to load. Trying again often works; if it doesn&rsquo;t, come back in a
            few minutes.
          </p>

          {error.digest && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#5f5f5f' }}>
              Reference: <code>{error.digest}</code>
            </p>
          )}

          <button
            type='button'
            onClick={reset}
            style={{
              marginTop: '2rem',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#ffffff',
              background: '#171717',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
