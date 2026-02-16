# Plan: Pay-Per-Attempt with EIP-3009 Authorization + Remove Names

## Context

Two changes combined into one refactor:

1. **Remove player names** — prevent griefing via offensive names on the leaderboard. Display formatted addresses instead.
2. **Pay per attempt (gasless)** — replace one-time signup with per-attempt payment using EIP-3009 `receiveWithAuthorization`. Players sign an off-chain authorization before playing, the server bundles it with the score submission after. Players never need gas.

### New User Flow
```
1. Connect wallet (Porto — passkey, no gas needed)
2. Click "Start Typing" → prompted to sign payment authorization (off-chain, no gas)
3. Player signs → game starts immediately
4. Player types the passage, score calculated
5. Frontend sends score + already-held signature to server (no second prompt)
6. Server submits one tx: authorization + score
7. See results, play again (each attempt costs 1 AUSD)
```

The authorization is signed **before** playing — the player commits to paying before knowing their score. This prevents griefing (play but refuse to pay).

### Why `receiveWithAuthorization` (EIP-3009)
- AUSD natively supports it (same as USDC) — use real deployed contract
- Player signs off-chain typed data → completely gasless
- `msg.sender == _to` check prevents front-running
- Random `bytes32` nonces — no sequential nonce state to read
- AgoRace contract is both the caller and the recipient

### Key Addresses (Arbitrum Sepolia)
| Contract | Address |
|----------|---------|
| AUSD (AgoraDollar) | `0xa9012a055bd4e0edff8ce09f960291c09d5322dc` |
| AUSD Role Holder | `0x99B0E95Fa8F5C3b86e4d78ED715B475cFCcf6E97` |
| AgoRace Proxy | `0xe9444c94fBc63B6a509CaA4B725efe1052D03a86` |
| Server/Operator | `0xb07eFD484Baf4E53767da2C00dd31D61840496a7` |

---

## Phase 1: AgoRace Contract

### `src/contracts/AgoRace.sol`

**Remove:**
- `error AlreadySignedUp()`, `error NotSignedUp()`, `error InvalidName()`
- `signup()` function entirely
- `playerName()` view function entirely
- `mapping(address => string) playerNames` from `PlayerStorage`
- `signedUp` from `PlayerState` struct → replace with `hasPlayed`
- `SignedUp` event
- Name cleanup in `startCompetition()` loop

**Modify:**
- Change token type: import `IAgoraDollar` from `src/interfaces/IAgoraDollar.sol` (already exists), use it instead of `IERC20` for the token reference 
- Rename `ENTRY_FEE` → `ATTEMPT_FEE` (1e6 = 1 AUSD per attempt)
- `submitAttempt` → new signature with auth params:
  ```
  submitAttempt(address _player, uint256 _score, uint256 _validAfter,
                uint256 _validBefore, bytes32 _nonce, uint8 _v, bytes32 _r, bytes32 _s)
  ```
  - Calls `token.receiveWithAuthorization(_player, address(this), ATTEMPT_FEE, _validAfter, _validBefore, _nonce, _v, _r, _s)` — pulls payment from player
  - `pot += ATTEMPT_FEE`
  - If `!_state.hasPlayed`: set `hasPlayed = true`, push to `players` array
  - Update best score if improved
- `getLeaderboard()` — return `(address[], uint256[])` (remove `string[]`)
- `getPlayerState()` — return `hasPlayed` instead of `signedUp`
- `startCompetition()` — clear `hasPlayed` flag (remove name cleanup)
- `settle()` — use `IERC20(address(token)).safeTransfer(winner, prize)` for payout (or cast accordingly)

### `src/contracts/interfaces/IAgoRace.sol`
- Mirror all contract changes (remove signup, update submitAttempt signature, update getLeaderboard return type, remove errors)

**Verify:** `forge build`

---

## Phase 2: Test Infrastructure

### `src/test/BaseTest.sol`

**Fork setup:** Tests fork Arbitrum Sepolia to use the real AUSD contract.
```
vm.createSelectFork("arb_sepolia");  // or use RPC URL from env
```

**Token:** Use `IAgoraDollar` at `0xa9012a055bd4e0edff8ce09f960291c09d5322dc` — no MockAUSD needed.

**Minting test tokens:** Prank as the role holder that has minter permissions:
```
address constant AUSD_ROLE_HOLDER = 0x99B0E95Fa8F5C3b86e4d78ED715B475cFCcf6E97;
vm.prank(AUSD_ROLE_HOLDER);
token.mint(alice, amount);
```

**Account setup:** Change from address-only to address+key pairs (needed for `vm.sign`):
```
(address alice, uint256 alicePk) = makeAddrAndKey("alice");
(address bob, uint256 bobPk) = makeAddrAndKey("bob");
```

**Remove:** `_signupAs()` helpers entirely

**Add signing helper** (mirrors `AgoraDollarSignatureFunctions` pattern):
```
_signReceiveWithAuthorization(uint256 _fromPk, uint256 _value, uint256 _validAfter, uint256 _validBefore, bytes32 _nonce)
  → returns (uint8 v, bytes32 r, bytes32 s)
```
1. Derive `_from = vm.addr(_fromPk)`
2. Construct struct hash: `keccak256(abi.encode(token.RECEIVE_WITH_AUTHORIZATION_TYPEHASH(), _from, address(agoRace), _value, _validAfter, _validBefore, _nonce))`
3. Get digest: `token.hashTypedDataV4(structHash)` — calls real AUSD's public function
4. Sign: `(v, r, s) = vm.sign(_fromPk, digest)`

**Add convenience helper:**
```
_submitAttempt(address _player, uint256 _playerPk, uint256 _score)
```
1. Mint ATTEMPT_FEE to player (via role holder prank)
2. Generate deterministic nonce: `keccak256(abi.encodePacked(_player, _score, block.timestamp))`
3. Set time bounds: `validAfter = 0`, `validBefore = block.timestamp + 1 hours`
4. Call `_signReceiveWithAuthorization(...)` to get signature
5. `vm.prank(operator)` → `agoRace.submitAttempt(_player, _score, validAfter, validBefore, nonce, v, r, s)`

**Verify:** `forge build`

---

## Phase 3: Test Suite

### `src/test/ago-race/TestSignup.t.sol`
- **Delete file** — no signup exists anymore
- Payment/registration tests move to TestSubmitAttempt

### `src/test/ago-race/TestSubmitAttempt.t.sol`
- Replace all `_signupAs()` calls with `_submitAttempt()` — players auto-register on first attempt
- Add tests for:
  - First attempt auto-registers player (added to players array, `hasPlayed = true`)
  - Each attempt charges ATTEMPT_FEE and adds to pot
  - Multiple attempts from same player (only registered once, pays each time)
  - Invalid/expired authorization reverts
  - Reused nonce reverts
  - Insufficient AUSD balance reverts
- Leaderboard test: verify returns `(address[], uint256[])` — no names

### `src/test/ago-race/TestSettle.t.sol`
- Update setup: use `_submitAttempt()` instead of `_signupAs()`
- Settlement logic unchanged (find highest score, pay winner)

**Verify:** `forge test -vvv`

---

## Phase 4: Frontend Types + ABI

### `frontend/types/index.ts`
- Remove `name: string` from `LeaderboardEntry`
- Remove `names: readonly string[]` from `LeaderboardData`
- Remove `signedUp` from `PlayerState` → add `hasPlayed`
- Update `AppState`: remove `"connected"` state (no signup gate), simplify to:
  `"landing" | "ready" | "playing" | "results" | "ended"`
- Update `SubmitAttemptRequest` to include auth params:
  ```ts
  { player, score, validAfter, validBefore, nonce, v, r, s }
  ```

### `frontend/lib/contracts.ts`
- **AgoRace ABI:**
  - Remove `signup` function
  - Update `submitAttempt` inputs to include auth params
  - Update `getLeaderboard` outputs: remove `_names`
  - Update `getPlayerState` output: `_hasPlayed` instead of `_signedUp`
  - Rename `ENTRY_FEE` → `ATTEMPT_FEE`
- **AUSD ABI** (replace basic `erc20Abi` with real AUSD functions):
  - Keep `balanceOf`, `decimals`
  - Remove `approve`, `allowance` (no longer needed)
  - Add `authorizationState(address,bytes32)` view
  - Add `RECEIVE_WITH_AUTHORIZATION_TYPEHASH()` view
  - Add `hashTypedDataV4(bytes32)` view
  - Add `eip712Domain()` view (for reading domain params, or hardcode)
- Rename `ENTRY_FEE` constant → `ATTEMPT_FEE` = `1_000_000n` (1 AUSD)

---

## Phase 5: Frontend Hooks

### Delete `frontend/hooks/useSignup.ts` entirely
- No longer needed — there's no signup step

### New hook: `frontend/hooks/usePaymentAuth.ts`
Handles the "sign before playing" flow. Called when player clicks "Start Typing":
1. Generate random `bytes32` nonce
2. Construct EIP-712 typed data for `ReceiveWithAuthorization`:
   - domain: `{ name: "Agora Dollar", version: "1", chainId, verifyingContract: AUSD_ADDRESS }`
   - types: `ReceiveWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce)`
   - message: `{ from: player, to: AGORACE_ADDRESS, value: ATTEMPT_FEE, validAfter: 0, validBefore: now+1hr, nonce }`
3. Sign with wagmi's `signTypedDataAsync`
4. Split signature into `v, r, s` (viem's `parseSignature`)
5. Store auth params in state, return them for later submission
- Exports: `signAuth()`, `isSigning`, `authParams` (null until signed), `error`

### `frontend/hooks/useSubmitAttempt.ts` — simplify
No longer needs to handle signing. Receives pre-signed auth params:
1. POST `{ player, score, validAfter, validBefore, nonce, v, r, s }` to API
2. Wait for response
- Signature: `submit(scoreEncoded: number, authParams: AuthParams) → SubmitAttemptResponse`

### `frontend/hooks/usePlayerState.ts`
- Rename `signedUp` → `hasPlayed`

### `frontend/hooks/useLeaderboard.ts`
- Change `const [players, scores, names] = data` → `const [players, scores] = data`
- Remove `name` from mapped entries

---

## Phase 6: Frontend Components + Pages

### Delete `frontend/components/competition/SignupButton.tsx` entirely
- No signup step exists anymore

### `frontend/app/page.tsx` (Home page)
- Remove `SignupButton` import and usage
- Remove signup-gated logic (`!signedUp && ...`)
- When connected + competition active → always show "Start Typing" button
- Update "How It Works" steps:
  1. Connect Wallet
  2. Sign & Play (1 AUSD per attempt, no gas)
  3. Type Fast
  4. Win Big
- Update fee notice: "1 AUSD per attempt" instead of "10 AUSD one-time"

### `frontend/app/play/page.tsx` (Play page) — key flow change
- Remove signup guard: no longer redirect if `!signedUp`
- Only check `isConnected` and competition active
- **New flow:**
  1. On mount (or on "Play" click): call `usePaymentAuth().signAuth()`
  2. Show "Authorizing payment..." while signing
  3. Once signed → start the typing game
  4. On game complete: call `submit(score, authParams)` — seamless, no second prompt
  5. Show results

### `frontend/components/typing/Results.tsx`
- No changes needed (already shows score, WPM, accuracy, rank)

### `frontend/components/competition/Leaderboard.tsx`
- Change `{entry.name || formatAddress(entry.address)}` → `{formatAddress(entry.address)}`

### `frontend/app/api/submit-attempt/route.ts` (API route)
- Update request body type: add `validAfter, validBefore, nonce, v, r, s`
- Validate all new fields
- Update contract call: `submitAttempt(player, score, validAfter, validBefore, nonce, v, r, s)`
- Update error handling: add auth-related error messages (expired, used nonce, insufficient balance)

---

## Phase 7: Documentation

### `DESIGN.md`
- Update game rules: "1 AUSD per attempt" instead of "10 AUSD one-time signup"
- Update user flow: sign before playing, seamless submission after
- Update architecture diagram: remove signup, show auth flow
- Update contract functions: remove `signup()`, update `submitAttempt()` signature
- Remove `playerNames` from state diagram

### `TODO.md`
- Add session note documenting both changes
- Update completed features list

### `SETUP.md`
- Remove signup-related instructions
- Add fork RPC setup for tests
- Update testing instructions for new flow

---

## Verification

1. `forge build` — contract compiles with IAgoraDollar
2. `forge test -vvv` — all tests pass against forked Arbitrum Sepolia with real AUSD
3. `cd frontend && npm run build` — no TypeScript errors
4. Spot checks:
   - `signup()` is gone from contract
   - `submitAttempt()` calls `receiveWithAuthorization` and charges per attempt
   - Tests use real AUSD with proper EIP-712 signing via `vm.sign`
   - Frontend signs auth before game starts, submits seamlessly after
   - Leaderboard shows addresses, not names
   - Home page has no signup button
   - Play page doesn't gate on signup status
