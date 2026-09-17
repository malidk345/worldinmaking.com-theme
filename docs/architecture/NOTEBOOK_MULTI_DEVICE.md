# Notebook multi-device checklist

Sync model: local markdown + optimistic `version` + three-way merge + delete tombstones.
Not Yjs. Do not rewrite the editor for these checks.

## Must pass before calling multi-device "done"

1. Same signed-in account, laptop then phone: create a note on A, reload B, body and title match.
2. Edit on A, wait for save (version bump), open on B without hard refresh if Realtime is up; otherwise pull on focus.
3. Offline on A, type a paragraph, go online: A saves; B receives merged body. No empty overwrite.
4. Concurrent edit on different blocks: both blocks survive.
5. Concurrent edit on the same paragraph: merge or local-keep + visible conflict, never silent wipe of both.
6. Delete on A: B must not resurrect the row after its next sync (tombstone).
7. Guest device key, then login: `claimDeviceAccount` moves `wim_notebooks.owner_key` to the user id; list shows guest notes.
8. Compacted list row (`contentOmitted`) must not PUT an empty body over a full remote body.
9. History restore uses remote history when local body was list-compacted.
10. Mention / comment notification opens `/notebooks/:id?mark=mention|comment` and `useNotebookMarkFocus` scrolls to the mark.

## Auth / secrets

- Never paste Supabase PATs or service-role keys into chat, commits, or `.env` that is tracked.
- Rotate any token that appeared in a chat log.
- Local only: `SUPABASE_ACCESS_TOKEN` in the shell or GitHub Actions secrets.
