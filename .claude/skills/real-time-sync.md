# Skill 13 — Real-time Sync (MANDATORY when feature uses live data)

Live updates use Socket.IO; background sync replays the offline queue. Real-time is an enhancement layered on top of offline-first — never a dependency for core function.

## When to use
Features with live updates (incoming payments, delivery status) or background sync.

## Rules
1. **Single socket connection** managed in one place (a socket service/hook), authenticated with the access token from SecureStore. Connect against `API_CONFIG.socketUrl`.
2. **Vendor-scoped events** — the server scopes events by the JWT's vendor; the client never subscribes by `vendorId` it supplies.
3. **Reconnect with backoff** — handle disconnect/reconnect gracefully; on reconnect, run delta sync + flush the mutation queue (`offline-first.md`).
4. **Apply events to the store**, not directly to screens — incoming events update the Zustand store; screens react via selectors.
5. **Idempotent updates** — de-dupe by record id; a re-delivered event must not create duplicates or corrupt state.
6. **Offline-first still wins** — if the socket is down, the app fully works on cached data; live updates resume on reconnect. Never block UI on socket state.
7. **Lifecycle** — connect on auth/app-active, disconnect on logout/background (battery); no tight polling loops.
8. **Clean teardown** — remove listeners on unmount/logout; no leaked handlers.
9. **No PII in socket logs**; log `correlationId`/event name (`error-handling.md`).

## Pattern
```ts
socket.on('payment:received', (evt: PaymentEvent) => {
  // idempotent: replace-or-insert by id, update store (not the screen)
  useLedgerStore.getState().upsertPayment(evt.payment)
})
socket.on('reconnect', () => { void syncEngine.deltaSync(); void mutationQueue.flush() })
// teardown
return () => { socket.off('payment:received'); socket.off('reconnect') }
```

## Definition of Done (Review checklist)
- [ ] One managed, token-authenticated socket; teardown on unmount/logout
- [ ] Events update the store; screens react via selectors
- [ ] Updates idempotent (de-dupe by id); no duplicates on re-delivery
- [ ] Reconnect → delta sync + queue flush; backoff on disconnect
- [ ] App fully functional with socket down (offline-first preserved)
- [ ] No tight polling; disconnect when backgrounded; no PII in logs

## Common violations → findings
- Socket event mutating screen state directly → MAJOR (layering)
- Listeners not removed on unmount → MAJOR (leak)
- Duplicate records on reconnect (non-idempotent) → CRITICAL
- UI blocked/broken when socket is down → CRITICAL (offline-first)
