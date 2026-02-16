# Plan: EIP-2612 Permit + TransferFrom (Replace EIP-3009)

## Context

### Problem
The current implementation uses EIP-3009 `receiveWithAuthorization` for gasless payments. This is **incompatible with Porto smart wallets**:

- Porto uses P256/WebAuthn passkeys — signatures are wrapped with key metadata: `encodePacked([signature, keyHash, prehash])` (33 extra bytes)
- EIP-3009 uses `ecrecover` (secp256k1 only) — the wrapped signature causes `parseSignature()` to fail with `"Invalid yParityOrV value"`
- AUSD's `isReceiveWithAuthorizationUpgraded` is `false` on-chain, meaning `receiveWithAuthorization` does NOT support EIP-1271

### Discovery
AUSD's `permit` function uses `SignatureCheckerLib.isValidSignatureNow` which supports **both** `ecrecover` AND EIP-1271. Since Porto accounts implement EIP-1271 via their EIP-7702 delegate, the `permit(address,address,uint256,uint256,bytes)` overload (with raw `bytes` signature) will work with Porto's wrapped P256 signatures.

### New Approach: EIP-2612 Permit + transferFrom
1. User signs EIP-2612 `Permit` off-chain (Porto prompts passkey, no gas)
2. Server calls `AUSD.permit(player, agoRace, maxUint256, deadline, rawSignature)` — EIP-1271 validates Porto's wrapped sig
3. Server calls `AgoRace.submitAttempt(player, score)` — contract uses `safeTransferFrom`
4. User signs **once** (infinite approval), plays forever with no further signing

This is **better UX than EIP-3009**: sign once vs sign before every game.

### New User Flow
```
1. Connect wallet (Porto passkey, no gas)
2. Click "Start Typing"
   → If no AUSD allowance: sign Permit (one-time, off-chain, no gas) → server calls permit
   → If allowance exists: skip straight to game
3. Type the passage, score calculated
4. Frontend sends {player, score} to server (+ permit sig if first time)
5. Server submits tx: submitAttempt(player, score)
6. See results, play again (no signing needed on subsequent games!)
```

---

## Phase 1: Contract Changes

### `src/contracts/AgoRace.sol`

**Token type:** Keep `IAgoraDollar public token` — retains explicit AUSD link, no functional reason to change.

**`submitAttempt` — simplify to 2 params:**
```solidity
function submitAttempt(
    address _player,
    uint256 _score
) external onlyOperator whenActive {
    IERC20(address(token)).safeTransferFrom(_player, address(this), ATTEMPT_FEE);
    pot += ATTEMPT_FEE;
    // ... rest unchanged (auto-register, update best score, emit event)
}
```

**Other changes:**
- Natdoc: remove all "EIP-3009" / "receiveWithAuthorization" references
- ConstructorParams natdoc: update to mention "must support EIP-2612 permit" instead of EIP-3009
- Version bump: `{ major: 3, minor: 0, patch: 0 }`

### `src/contracts/interfaces/IAgoRace.sol`
- Regenerate: `forge inspect AgoRace abi | cast interface`
- Key change: `submitAttempt(address,uint256)` instead of 8-param version

**Verify:** `forge build`

---

## Phase 2: Test Changes

### `src/test/BaseTest.sol`

**Remove entirely:** `_signReceiveWithAuthorization()`, `_prepareAttempt()` — no more EIP-3009 signing

**Simplify `_submitAttempt`:**
```solidity
function _submitAttempt(address _player, uint256 _playerPk, uint256 _score) internal {
    _mintAUSD(_player, ATTEMPT_FEE);
    vm.prank(_player);
    IERC20(address(token)).approve(address(agoRace), ATTEMPT_FEE);
    vm.prank(operatorAddress);
    agoRace.submitAttempt(_player, _score);
}
```
Keep `_playerPk` param unused — avoids mass test callsite edits (all tests pass `(alice, alicePk, score)`).

Add `import { IERC20 }` at top.

### `src/test/ago-race/TestSubmitAttempt.t.sol`

Tests using `_submitAttempt(...)` helper work unchanged.

**Rewrite tests that called `_prepareAttempt` directly** (they used EIP-3009 params):
- `test_EmitsAttemptSubmittedEvent` — mint, approve, prank operator, `submitAttempt(alice, score)`
- `test_OwnerCanAlsoSubmitAttempts` — mint, approve, prank owner, `submitAttempt(alice, score)`
- `test_RevertWhen_NotOperator` — mint, approve, prank alice, expect revert
- `test_RevertWhen_CompetitionNotStarted` — mint, approve, expect revert
- `test_RevertWhen_CompetitionEnded` — mint, approve, expect revert
- `test_RevertWhen_InsufficientBalance` — approve but don't mint, expect revert

**Delete tests (no longer applicable):**
- `test_RevertWhen_ReusedNonce` — no nonces with approve/transferFrom
- `test_RevertWhen_ExpiredAuthorization` — no authorization expiry

**Add new test:**
- `test_RevertWhen_InsufficientAllowance` — mint but don't approve, expect revert

### `src/test/ago-race/TestSettle.t.sol`
- No changes needed — only calls `_submitAttempt` helper

**Verify:** `forge test -vvv`

---

## Phase 3: Frontend — Types & ABI

### `frontend/types/index.ts`
- Replace `AuthParams` with:
```ts
export interface PermitParams {
  deadline: bigint;
  signature: `0x${string}`; // Raw bytes — NOT parsed into v,r,s
}
```

### `frontend/lib/contracts.ts`

**AgoRace ABI — update `submitAttempt`:**
```ts
{
  name: "submitAttempt",
  inputs: [
    { name: "_player", type: "address" },
    { name: "_score", type: "uint256" },
  ],
}
```

**AUSD ABI — replace EIP-3009 entries with permit entries:**
- Keep: `balanceOf`, `decimals`
- Remove: `authorizationState`, `RECEIVE_WITH_AUTHORIZATION_TYPEHASH`, `hashTypedDataV4`, `eip712Domain`
- Add: `allowance(address,address)`, `nonces(address)`, `permit(address,address,uint256,uint256,bytes)`

---

## Phase 4: Frontend — Hooks

### Delete `frontend/hooks/usePaymentAuth.ts`

### New: `frontend/hooks/usePermit.ts`
Signs EIP-2612 Permit for infinite AUSD approval of AgoRace:
1. Read `nonces(player)` from AUSD contract (via `useReadContract`)
2. Construct EIP-712 typed data:
   - domain: `{ name: "Agora Dollar", version: "1", chainId, verifyingContract: AUSD_ADDRESS }`
   - types: `Permit(address owner, address spender, uint256 value, uint256 nonce, uint256 deadline)`
   - message: `{ owner: player, spender: AGORACE_ADDRESS, value: maxUint256, nonce, deadline: now+1hr }`
3. Call `signTypedDataAsync` — Porto prompts passkey
4. **Return raw signature hex** — DO NOT call `parseSignature()`!
5. Store `{ deadline, signature }` as `PermitParams`

Exports: `signPermit()`, `isSigning`, `permitParams`, `error`, `reset`

### New: `frontend/hooks/useAllowance.ts`
Checks current AUSD allowance for AgoRace:
- `useReadContract` calling `allowance(player, AGORACE_ADDRESS)` on AUSD
- Returns `{ allowance, hasSufficientAllowance, isLoading, refetch }`
- `hasSufficientAllowance = allowance >= ATTEMPT_FEE`

### Update: `frontend/hooks/useSubmitAttempt.ts`
- Change signature: `submit(scoreEncoded: number, permitParams?: PermitParams)`
- Request body: `{ player, score, deadline?, signature? }` (permit params optional)
- Remove all `AuthParams` references

---

## Phase 5: Frontend — Play Page & API

### `frontend/app/play/page.tsx`

**New state machine:** `"checking" | "approving" | "playing" | "results"`

1. On mount: check allowance via `useAllowance`
2. If `hasSufficientAllowance`: skip to "playing" immediately
3. If not: enter "approving" → call `signPermit()` → on success → "playing"
4. On game complete: call `submit(score, permitParams)` — include permit if we signed one
5. After successful submit: refetch allowance (future games skip approval)

Replace `usePaymentAuth` with `usePermit` + `useAllowance`.

### `frontend/app/api/submit-attempt/route.ts`

**New request body:** `{ player, score, deadline?, signature? }`

**Server logic:**
1. Validate player + score (existing)
2. If `deadline` + `signature` present:
   - Call `AUSD.permit(player, agoRace, maxUint256, deadline, signature)` via server wallet
   - Wait for receipt
3. Call `AgoRace.submitAttempt(player, score)` via server wallet
4. Return tx hash

Update error messages: replace auth errors with permit errors (`Erc2612ExpiredSignature`, `Erc2612InvalidSignature`).
Remove v/r/s validation. Add deadline + signature (isHex) validation.

### `frontend/app/page.tsx`
- Update fee notice text: "Sign a one-time approval, then play as many times as you want — no gas needed."
- Update "How It Works" step 2 desc: "One-time approval, then play unlimited — no gas"

---

## Phase 6: Documentation

### `DESIGN.md`

**Replace "Why EIP-3009" section with "Why EIP-2612 Permit (Not EIP-3009)":**
- Explain Porto incompatibility with EIP-3009 (P256 + ecrecover)
- Explain why permit works (EIP-1271 via `SignatureCheckerLib`)
- Better UX: sign once, play forever

**Update throughout:**
- Overview: "via EIP-2612 permit + transferFrom"
- Game Rules table: `Attempt fee | 1 AUSD per attempt (gasless via EIP-2612 permit)`
- User Flow: reflect one-time approval + unlimited play
- Architecture diagram: remove "Sign Auth" → add "Sign Permit (one-time)"
- Key Design Decisions table: `EIP-2612 permit + transferFrom | Gasless, EIP-1271 compatible with Porto`
- Smart Contract section: simplified `submitAttempt(player, score)`
- UI States: "Approving (one-time)" instead of "Authorizing", note it's skipped on subsequent plays

---

## Verification

1. `forge build` — contract compiles with simplified submitAttempt
2. `forge test -vvv` — all tests pass (approve + transferFrom pattern)
3. `cd frontend && npm run build` — no TypeScript errors
4. Spot checks:
   - `receiveWithAuthorization` gone from contract
   - `submitAttempt` only takes `(player, score)` and uses `safeTransferFrom`
   - Tests use simple `approve` + `submitAttempt` (no EIP-3009 signing)
   - Frontend signs permit with raw bytes (no `parseSignature`)
   - API route handles optional permit + simplified submitAttempt
   - Allowance check skips permit on subsequent plays
5. Deploy new implementation + upgrade proxy (`--gas-estimate-multiplier 200` for Arbitrum)
6. Start new competition, test full flow in browser with Porto
