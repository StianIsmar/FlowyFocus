# Personal Notes & To-Do — Design Decisions

This document records the decision tree resolved during the "grill-me" interview.

## 1. Stack & hosting
- **Frontend:** Vite + React + TypeScript (single-page app).
- **Hosting:** Vercel (static build output, no server).
- **Backend:** Supabase — managed Postgres + Auth + Row-Level Security (RLS).
- **Rationale:** A personal notes/todo app doesn't need a bespoke server. The
  browser talks directly to Supabase; RLS guarantees each user only ever reads
  or writes their own rows. Less infra to run, generous free tier, fast to ship.

## 2. Auth
- **Google (Gmail) login** via Supabase Auth OAuth.
- No passwords stored by us. Supabase manages sessions; `auth.uid()` drives RLS.

## 3. Domain model
- **Notes** and **Tasks** are two separate concepts.
- Both belong to a **Group** (so focus mode works for both).
- **Groups** are fully user-managed: create / rename / delete / recolor.

### Tables
- `groups(id, user_id, name, color, position, created_at)`
- `tasks(id, user_id, group_id, title, description, priority, due_date,
   is_done, subtasks jsonb, position, completed_at, created_at)`
- `notes(id, user_id, group_id, title, content, created_at, updated_at)`

### Task fields (from interview)
- Due date, description/body, priority (low/med/high), sub-task checklist.
- Sub-tasks stored as a JSONB array `[{ id, text, done }]` to avoid an extra
  table for a one-to-few relationship (kept simple on purpose).

## 4. Focus UX (core differentiator)
- **One group fills the entire screen.** Other groups are hidden behind a
  collapsible group switcher.
- Selecting a group navigates to `/g/:groupId` (bookmarkable, single group only).
- The group's own color themes the focus view to reinforce "you are here".
- Within a focus view: Tasks column + Notes are scoped strictly to that group.

## 5. Explicitly out of scope (v1)
- Sharing/collaboration, reminders/push, mobile native, offline sync,
  rich-text/markdown rendering in notes (plain textarea for now).
