# Skill 05 — Offline-First (MANDATORY)

This is a tier 2-3 city app: **offline is the default assumption**, online is the bonus. Every read shows cached data; every write succeeds locally and syncs later.

## When to use
Any feature that reads or writes server data.

## Rules
1. **Reads**: serve cached data immediately (local DB / persisted store), then refresh from network when connected. Never block the UI on the network.
2. **Writes go local-first**: apply optimistically to local state/DB, enqueue a mutation, return success to the UI, then replay the queue on reconnect.
3. **Mutation queue**: persist queued mutations (AsyncStorage / WatermelonDB) so they survive app kills. Replay **in order** on reconnect; mark each pending → synced → confirmed.
4. **Connectivity** comes from `useNetworkStatus()` (`@react-native-community/netinfo`). Show the offline banner on every screen when `!isConnected`.
5. **Sync indicators** (WhatsApp pattern): pending (clock), synced (tick), failed (retry). Show a "last synced" time where relevant.
6. **Conflict resolution**: last-write-wins by default, notify the user; never silently drop a user's change.
7. **No data loss**: a write must never be lost because the network was down. If a queued mutation fails permanently, surface it for retry.
8. **Delta sync**: on reconnect, fetch only records changed since the last sync timestamp.
9. **No PII in any sync log** (see `error-handling.md`).

## Pattern (local-first write)
```ts
addCustomer: async (dto) => {
  const temp: Customer = { ...dto, id: `local-${Date.now()}`, _pending: true }
  set((s) => ({ customers: [...s.customers, temp] }))   // optimistic
  await mutationQueue.enqueue({ type: 'customer.create', payload: dto, localId: temp.id })
  if (useNetworkStatus.getState().isConnected) void mutationQueue.flush()  // replay when online
}
```

## Definition of Done (Review checklist)
- [ ] Reads render cached data without waiting on the network
- [ ] Writes apply optimistically + enqueue a persisted mutation
- [ ] Queue replays in order on reconnect; status pending→synced→confirmed
- [ ] Offline banner shown when `!isConnected`; network-only actions disabled
- [ ] Conflict strategy defined (LWW + user notice); no silent drops
- [ ] No write can be lost across an app kill while offline
- [ ] Sync/delta uses last-sync timestamp

## Common violations → findings
- Write that only hits the network and errors offline → CRITICAL (data loss / missing offline)
- No offline banner / no cached read → CRITICAL
- In-memory-only queue lost on app kill → MAJOR
- Silent conflict overwrite with no user notice → MAJOR
