# Move a Task Between Lists — Product & Implementation Spec

## Summary

Allow a user to move an existing task from its current group to another group.
FlowyFocus calls these containers **groups** in the UI and data model, so this
spec uses "destination group" for the list receiving the task.

The first version adds a **Group** selector to the task editor. Selecting a new
group and confirming the move updates the task without changing its other
fields. The task disappears from the source group and appears at the end of the
destination group's task list.

## Goals

- Move one existing task to another group without recreating it.
- Preserve the task's title, description, status, priority, due date,
  importance, checklist, pictures, completion timestamp, and creation date.
- Give immediate, clear feedback and recover cleanly if saving fails.
- Work from both a normal group view and the cross-group **Most important** view.
- Keep the interaction usable with a mouse, touch, and keyboard.

## Non-goals

- Dragging tasks directly between groups in the collapsed group switcher.
- Moving multiple tasks at once.
- Copying or duplicating a task.
- Moving notes or whole groups.
- Adding undo history or a move activity log.
- Changing a task's status as part of the move.

## User experience

### Entry point

Add a **Group** field to `TaskEditor`, alongside Status, Priority, and Due. It is
a native select populated with every group available to the signed-in user.
The current group is selected initially.

- If the user has only one group, show the field disabled with the current
  group selected. This makes the task's location visible without presenting an
  action that cannot succeed.
- Order options the same way as the group switcher: group `position`, then
  `created_at`.
- Show each option's group name. Color remains a visual enhancement outside the
  native option list and must not be the only identifier.

### Move flow

1. The user opens a task.
2. The user chooses a different value in **Group**.
3. Show an inline confirmation row: `Move to “{destination name}”?` with
   **Move task** and **Cancel** actions.
4. **Cancel** restores the current group selection and changes no data.
5. **Move task** disables the move controls and shows a pending state while the
   update is saved.
6. On success:
   - In a normal group view, close the editor and remove the task from the
     source view. Show a transient confirmation: `Moved to {destination name}`.
   - In **Most important**, keep the editor open because the task still belongs
     in that virtual view. Update its selected group and show the same
     confirmation.
7. On failure, restore the original group selection, keep the editor open, and
   show an actionable inline error: `Couldn’t move the task. Try again.`

Changing the select alone never moves the task; the explicit confirmation
prevents accidental moves while navigating the editor with a keyboard.

### Keyboard and accessibility

- The field has a visible `Group` label associated with the select.
- Confirmation actions are reachable in normal tab order.
- While saving, set `aria-busy="true"` on the confirmation region and disable
  both actions.
- Announce success and failure messages through an `aria-live="polite"` region.
- `Escape` while confirmation is visible cancels the pending destination first;
  a second `Escape` closes the editor.
- Existing `Cmd/Ctrl+Enter` behavior must not silently confirm a move. It closes
  the editor only when no move confirmation is pending.

## Data behavior

No database migration is required. A task already belongs to a group through
`tasks.group_id`, and the existing task RLS policy permits updating rows owned
by the signed-in user.

Persist the move as one task-row update containing both fields:

```ts
{
  group_id: destinationGroupId,
  position: destinationPosition,
}
```

`destinationPosition` places the task after the current last task in the
destination group. Determine it by selecting the destination group's highest
`position`; use `0` when the destination is empty. Exact position values do not
need to be contiguous, because existing task queries use `created_at` as a
stable secondary order.

Do not change `user_id`. Moving between groups owned by different users is out
of scope until shared groups are implemented. When shared groups are added,
the move is allowed only when RLS confirms write access to both the task and
destination group.

### Local state and rollback

Add a dedicated `moveTask` operation instead of sending `group_id` through the
generic `updateTask` path. The operation must:

1. Snapshot the source task.
2. Optimistically remove it from a group-scoped task collection, or update its
   `group_id` in the **Most important** collection.
3. Persist `group_id` and `position` in one Supabase update.
4. On failure, restore the snapshot and expose the error.
5. On success, reload task statistics so source and destination dashboard counts
   update immediately.

Duplicate destination positions caused by simultaneous moves are acceptable in
this version; `created_at` provides deterministic display ordering. A future
multi-user implementation should replace the client-side position lookup with
a database function that allocates the destination position transactionally.

## Component and hook changes

### `App` and focus views

- Pass the loaded `groups` collection to both `GroupFocus` and
  `ImportantFocus`.
- Pass a move callback and view context (`group` or `important`) through
  `TasksView` to `TaskEditor`.
- Reuse the existing task-statistics refresh callback after a successful move.

### `useTasks`

Expose:

```ts
moveTask(task: Task, destinationGroupId: string): Promise<boolean>
```

The method returns `true` only after Supabase confirms the update. It rejects a
no-op move to the task's current group before making a request. Existing
`updateTask` behavior remains unchanged for edits that do not change ownership.

### `TaskEditor`

Add these inputs:

```ts
groups: Group[]
viewContext: 'group' | 'important'
onMove: (task: Task, destinationGroupId: string) => Promise<boolean>
```

Keep the selected destination and pending/error feedback local to the editor.
The parent remains responsible for closing the editor after a successful move
from a normal group view.

## Edge cases

- **Destination deleted before confirmation:** the update fails or affects no
  row; restore the task and ask the user to retry. Reload groups on the next
  normal app refresh.
- **Task deleted in another tab:** treat an update returning no row as failure;
  reload the current task collection.
- **Move while viewing Most important:** preserve `is_important`; the task stays
  visible and only its group label changes.
- **Completed task:** preserve `status`, `is_done`, and `completed_at` exactly.
- **Filtered board column:** preserve status, so the task appears in the same
  Kanban column in the destination group.
- **Destination has reordered tasks:** append after its highest stored
  `position`, not after the source task's position.
- **Long or duplicate group names:** allow wrapping in the confirmation text;
  duplicate names remain distinguishable through their existing switcher order.
- **Current group absent from `groups`:** disable moving and show the task's
  current location as unavailable rather than selecting an arbitrary group.

## Acceptance criteria

- A task editor displays the task's current group.
- A user with at least two groups can choose and explicitly confirm another
  group as the destination.
- A successful move changes `tasks.group_id` and appends the task to the
  destination ordering.
- Every task field other than `group_id` and `position` remains unchanged.
- The moved task disappears immediately from a normal source group view.
- Opening the destination group shows the task in its original status column.
- Moving from **Most important** keeps an important task visible there and
  updates its group selection.
- Source and destination dashboard statistics refresh after a successful move.
- A failed move restores the task in the source view and communicates the
  failure without closing the editor.
- Choosing the current group makes no request and offers no confirmation.
- The full flow is keyboard operable and pending/result states are announced to
  assistive technology.

## Verification plan

### Automated tests

- `useTasks.moveTask` computes `0` for an empty destination and highest
  `position + 1` for a populated destination.
- A successful move sends one task update containing `group_id` and `position`.
- A normal group collection removes the moved task optimistically.
- The Important collection retains the task and updates its `group_id`.
- A failed update restores the original task and returns `false`.
- Selecting the current group does not call `onMove`.
- The editor requires confirmation, disables controls while pending, and shows
  success or failure feedback.

### Manual checks

1. Move todo, in-progress, and done tasks between populated groups.
2. Move a task into an empty group and verify it appears first.
3. Move an important task from the **Most important** view.
4. Force a Supabase failure and verify rollback and retry behavior.
5. Complete the flow using only the keyboard, including canceling with Escape.
6. Verify dashboard counts for both groups after the move.

## Release notes

No schema deployment is needed. Ship the frontend change after the production
`tasks` policy is confirmed to permit owned-row updates. Add this user-facing
release note:

> Tasks can now be moved to another group from the task editor.