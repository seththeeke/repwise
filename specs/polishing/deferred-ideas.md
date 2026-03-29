### Optimistic UI

- [ ] Log set: Update local state immediately; revert on API error + show toast
- [ ] Skip set: Same pattern
- [ ] Reorder exercises in builder: Already local; ensure API failure is handled
- [ ] Add/remove exercise in builder: Optimistic update with rollback on error

### Progress Indicators on Long Operations

- [ ] AI workout generation: Show progress steps (e.g. "Finding exercises...", "Building workout...") — may already exist
- [ ] Data import (if added later): Progress bar
- [ ] Sync operations: Percentage or step indicator instead of spinner only