# Template Update Preview Design

## Goal

Make `bun run update` safe by default. The command should fetch the upstream template, show which files would be updated or skipped, and ask for confirmation before writing. A separate apply flag should bypass the prompt for non-interactive use. The updater should also avoid rewriting files whose content is already identical, so Git does not show noisy working tree changes from needless overwrites.

## Command Model

- `bun run update`
  - Fetch upstream
  - Compute the tracked file list
  - Classify each file as `update`, `skip`, or `unchanged`
  - Print the list
  - Prompt the user to confirm
  - Apply only if confirmed
- `bun run update --apply`
  - Same classification
  - Skip the prompt
  - Apply immediately

## Sync Rules

- `update.json` still owns `protect` and `update`
- `update.json` itself is never overwritten
- If a file matches `protect`, it is skipped
- If a file matches `update`, it is eligible for update even inside protected areas
- If a file would be updated but its content already matches the upstream file, do not rewrite it

## Line Endings

The repository currently has `core.autocrlf=true` locally and no `.gitattributes`, which makes rewritten files appear modified even when their logical content did not change. Add a repo-level `.gitattributes` with a stable text normalization rule so Git has a consistent policy across contributors.

## Testing

- Add tests for preview classification counts and file lists
- Add tests proving apply mode only writes files with real content changes
- Add tests for prompt bypass in `--apply`
- Add a repository-level check for `.gitattributes`
