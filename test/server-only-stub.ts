// Alias target for `server-only` under Vitest (see vitest.config.mts).
// The real package only matters to bundlers enforcing a client/server boundary;
// under Node it can be a no-op so server modules import cleanly in tests.
export {};
