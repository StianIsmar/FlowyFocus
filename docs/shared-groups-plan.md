# Shared Groups — Design & Implementation Plan

Goal: let a user share a group with another person by email. The invitee gets
**read + write** (editor) access. They receive an invitation, and can **accept**
or **decline** the shared group.

---

## Current state (baseline)

The app is **owner-scoped**. Every `group`, `task`, and `note` row is locked to a
single `user_id` via Row-Level Security:

```sql
create policy "groups owner" on public.groups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- same pattern for tasks and notes
```

- Auth: Google OAuth via Supabase (`AuthProvider.tsx`).
- Data hooks: `useGroups`, `useTasks`, `useNotes` select rows the current user owns.

To support sharing, access must change from **"you own the row"** to
**"you are a member of the row's group."**

---

## 1. Database — membership model + invitations

```
groups ||--o{ group_members      : has
groups ||--o{ group_invitations  : has
group_members      }o--|| auth.users : user_id
group_invitations  }o--|| auth.users : invited_by
```

### `group_members`
Who can access a group. The owner is a member with role `owner`; invited people
get `editor` (read + write).

| column     | type | notes                                  |
| ---------- | ---- | -------------------------------------- |
| group_id   | uuid | FK → groups(id) on delete cascade      |
| user_id    | uuid | FK → auth.users(id) on delete cascade  |
| role       | enum | `owner` \| `editor` (extensible)       |
| created_at | timestamptz | default now()                   |
| PK         | (group_id, user_id) |                          |

### `group_invitations`
A pending invite keyed by email. Status flows `pending → accepted | declined`.

| column        | type | notes                                   |
| ------------- | ---- | --------------------------------------- |
| id            | uuid | PK default gen_random_uuid()            |
| group_id      | uuid | FK → groups(id) on delete cascade       |
| invited_email | text | lower-cased email of the invitee        |
| invited_by    | uuid | FK → auth.users(id)                     |
| role          | enum | default `editor`                        |
| status        | enum | `pending` \| `accepted` \| `declined`   |
| token         | uuid | default gen_random_uuid() (for links)   |
| created_at    | timestamptz | default now()                    |

---

## 2. RLS rewrite (the important part)

Access becomes membership-based. Replace the owner-only policies on
`groups` / `tasks` / `notes` with checks against `group_members`.

Helper to avoid recursive policy evaluation:

```sql
-- returns true if the current user is a member of the given group
create or replace function public.is_group_member(g uuid)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = g and m.user_id = auth.uid()
  );
$$;
```

New policies (sketch):

```sql
-- groups: visible to any member; only owner can delete/rename
drop policy if exists "groups owner" on public.groups;
create policy "groups read"   on public.groups for select
  using (public.is_group_member(id));
create policy "groups write"  on public.groups for update
  using (public.is_group_member(id));
create policy "groups insert" on public.groups for insert
  with check (auth.uid() = user_id);
create policy "groups delete" on public.groups for delete
  using (auth.uid() = user_id);  -- only original owner

-- tasks: any member of the task's group can read + write
drop policy if exists "tasks owner" on public.tasks;
create policy "tasks all" on public.tasks for all
  using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

-- notes: same as tasks
drop policy if exists "notes owner" on public.notes;
create policy "notes all" on public.notes for all
  using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));
```

`group_members` / `group_invitations` need their own policies:

- A user can read their own membership rows.
- A group **owner** can insert/delete members and create invitations.
- An invitee can read invitations addressed to **their** email and update the
  status when accepting/declining.

> Note: `security definer` on `is_group_member` is required so the policy can
> read `group_members` without recursing into its own RLS. Keep the function
> minimal and `stable`.

### Migration housekeeping
- Backfill: insert an `owner` row into `group_members` for every existing group
  (`select id, user_id, 'owner' from groups`).
- Keep `groups.user_id` as the "created by / owner" pointer.
- Apply as additive SQL in the Supabase SQL editor (the RLS swap is the only
  hard-to-undo step — review before running).

---

## 3. UI flow

- **Share button** on a group → enter an email → creates a `pending`
  invitation (`group_invitations` insert).
- **Invitations inbox** — a badge in the sidebar that appears when the logged-in
  user has invitations matching their email. Each shows **Accept** / **Decline**.
  - Accept → insert into `group_members` (role `editor`) + set invitation
    `status = 'accepted'`.
  - Decline → set invitation `status = 'declined'`.
- **Members list** on a shared group (optional) → owner can see members and
  revoke access (delete the `group_members` row).

### New / changed frontend pieces
- `useGroupMembers(groupId)` — list/add/remove members.
- `useInvitations()` — list invitations for the current user's email; accept/decline.
- `ShareGroupDialog.tsx` — email input + pending invite list.
- `InvitationsInbox.tsx` — sidebar badge + accept/decline list.
- `useGroups` — already works once RLS is membership-based (it selects all groups
  the user can see, which now includes shared ones).

---

## 4. Email delivery — the one real decision

Supabase will **not** send a custom "you've been invited" email by itself.

### Option A — In-app only (no secrets, works immediately) ✅ recommended first
The invite appears in the recipient's **Invitations inbox** the moment they sign
in with the matching email. No email provider required.

### Option B — Real email
A Supabase **Edge Function** triggered on new invitation that calls an email
provider (Resend / SendGrid). Requires:
- An email provider API key (stored as a function secret).
- Deploying the edge function.
- A DB webhook / trigger on `group_invitations` insert → invoke the function.

Both options share the **exact same** database + UI work. Option B just adds the
email-sending function on top. Build **A** first (fully functional accept flow),
layer **B** on later.

---

## Open questions

- Roles: only **editor (read + write)** for now, or also a **read-only** role?
- Should the owner be able to **revoke** access after sharing? (assumed yes)
- On accept, should the shared group appear inline in the sidebar list, or in a
  separate "Shared with me" section?

---

## Implementation checklist

- [ ] SQL: `group_members` + `group_invitations` tables + enums
- [ ] SQL: `is_group_member()` security-definer helper
- [ ] SQL: rewrite RLS on `groups` / `tasks` / `notes`
- [ ] SQL: RLS for `group_members` / `group_invitations`
- [ ] SQL: backfill owner memberships for existing groups
- [ ] Hook: `useGroupMembers`
- [ ] Hook: `useInvitations`
- [ ] UI: `ShareGroupDialog`
- [ ] UI: `InvitationsInbox` (sidebar badge)
- [ ] (Optional) UI: members list + revoke
- [ ] (Optional) Edge Function for real email (Option B)
