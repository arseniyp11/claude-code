# CLAUDE.md

We're building the app described in @SPEC.MD. Read that file for general architectural tasks or to double-check the exact database structure, tech stack or application architecture.

Keep your replies extremely concise and focus on conveying the key information. No unnecessary fluff, no long code snippets.

Whenever working with any third-party library or something similar, you MUST look up the official documentation to ensure that you're working with up-to-date information.
Use the DocsExplorer subagent for efficient documentation lookup.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repo is currently just the default `create-next-app` scaffold (`app/layout.tsx`, `app/page.tsx`). None of the application described below has been implemented yet — `SPEC.MD` in the repo root is the full technical specification to build against. Read it before implementing any feature; it defines the exact DB schema, repository function signatures, API routes, and page/component layout to follow.

## Commands

This project uses **Bun** as the runtime and package manager (`bun.lock` is present).

```bash
bun install       # install dependencies
bun dev           # start dev server (next dev)
bun run build     # production build (next build)
bun run start     # start production server
bun run lint      # eslint
```

There is no test suite configured yet.

## Architecture (per SPEC.MD)

This will be a Next.js App Router note-taking app with rich-text editing (TipTap) and public link sharing, built on:

- **Runtime:** Bun, for both dev and production
- **Database:** a single SQLite file (`data/app.db`) accessed via Bun's built-in SQLite client using raw SQL (no ORM) — a `lib/db.ts` module exposes `getDb()` plus `query`/`get`/`run` helpers
- **Auth:** `better-auth`, configured with `account: { identityStrategy: "provider-id" }` so the `account.issuer` column is populated deterministically. better-auth owns the `user`, `session`, `account`, and `verification` tables; use its CLI (`npx @better-auth/cli generate`/`migrate`) to keep them in sync with the actual auth config rather than hand-editing schema
- **Data layer:** `lib/notes.ts` holds note repository functions (`createNote`, `getNoteById`, `getNotesByUser`, `updateNote`, `deleteNote`, `setNotePublic`, `getNoteByPublicSlug`); every function scopes its query by `user_id` except the public-slug lookup, to keep cross-user access impossible at the data layer rather than relying on API-layer checks alone
- **API layer:** REST-like Route Handlers under `app/api/notes/...` (list/create, get/update/delete by id, share toggle) plus a public read path for `/p/[slug]`; all authenticated routes return 401 via a shared `getCurrentUser()`/`getSession()` helper rather than duplicating auth checks per-route
- **Frontend:** server components fetch data; the TipTap editor and other interactive pieces (share toggle, delete button) are client components. Notes are stored and transmitted as TipTap JSON (`content_json`), never as raw HTML — rendering read-only public notes must go through TipTap's own rendering, not `dangerouslySetInnerHTML`

Key routes: `/` (landing), `/dashboard` (authenticated note list), `/notes/[id]` (editor), `/p/[slug]` (public read-only view, works unauthenticated).

Security model: every private note operation is scoped to the session's `user_id` at the data-access layer; public notes are exposed only via a long random `public_slug`, are always read-only, and return 404 (not a permission error) when disabled or missing.
