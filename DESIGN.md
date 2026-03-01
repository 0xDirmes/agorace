# Agora Type - Design Document

Weekly typing competition with on-chain prize pool. Fully on-chain architecture with Porto for seamless UX.

## Overview

A week-long typing tournament where players pay 1 AUSD per attempt via gasless approve + transferFrom. The player with the highest score (WPM * accuracy%) at the end of the week wins the entire pot. All attempts are recorded on-chain for public verifiability.

## Game Rules

| Parameter | Value |
|-----------|-------|
| Attempt fee | 1 AUSD per attempt (gasless via Porto approve) |
| Duration | 7 days (hardcoded) |
| Text | Same passage for entire competition |
| Scoring | `WPM * accuracy%` (e.g., 80 WPM at 95% = 76.0) |
| Winner | Single winner, takes 100% of pot |
| Ties | First player to reach the highest score wins |
| Settlement | Owner-triggered at competition end |

## User Flow

```
1. Connect wallet via Porto (passkey-based, no extension needed)
2. View leaderboard + current pot size + time remaining
3. Click "Start Typing"
   -> If no AUSD allowance: approve AUSD (one-time tx via Porto, gas-sponsored) -> game starts
   -> If allowance exists: skip straight to game
4. Type the passage as fast and accurately as possible
5. Score calculated -> server submits tx: submitAttempt(player, score)
6. See results: WPM, accuracy, final score, leaderboard position
7. Play again (no approval needed on subsequent games!)
8. At week end: owner settles, winner receives entire pot
```

## Architecture

### Fully On-Chain Model

```
+-------------------------------------------------------------+
|                     Frontend (Next.js 14)                    |
|                                                              |
|  +--------------+  +--------------+  +------------------+   |
|  |  Typing UI   |  |  Leaderboard |  |  Porto Wallet    |   |
|  |  - Passage   |  |  - Rankings  |  |  - Connect       |   |
|  |  - Input     |  |  - Your best |  |  - Approve AUSD  |   |
|  |  - Live WPM  |  |  - Pot size  |  |    (one-time tx)  |   |
|  |  - Accuracy  |  |  - Time left |  |  - Status        |   |
|  +--------------+  +--------------+  +------------------+   |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                    API Routes (Next.js)                      |
|                                                              |
|  POST /api/submit-attempt                                    |
|    - Receive { player, score } from client                   |
|    - Call AgoRace.submitAttempt(player, score) (sponsored)   |
|    - Return tx hash                                          |
|                                                              |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                    Smart Contract (On-Chain)                  |
|                                                              |
|  State:                                                      |
|    - playerState: mapping(address => PlayerState)            |
|        - bestScore: uint32                                   |
|        - hasPlayed: bool                                     |
|    - players: address[] (for settlement iteration)           |
|    - pot: uint256                                            |
|    - startTime, endTime, settled                             |
|                                                              |
|  Functions:                                                  |
|    - submitAttempt(player, score) -> pulls payment via       |
|      safeTransferFrom (requires prior approve), records score|
|    - settle() -> owner pays winner                           |
|    - getLeaderboard() -> returns players, scores             |
|                                                              |
|  Events:                                                     |
|    - AttemptSubmitted(player, score, bestScore, pot)         |
|    - Settled(winner, prize)                                  |
+-------------------------------------------------------------+
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data storage | Fully on-chain | Public verifiability, no DB needed |
| Payment | Direct approve + transferFrom | Porto handles EIP-7702 delegation + gas sponsoring |
| Attempt submission | Server-sponsored | User doesn't pay gas, seamless UX |
| Score calculation | Client-side (MVP) | Trusted for now, auditable later |
| Winner calculation | On-chain iteration | Contract finds highest score at settlement |
| Wallet | Porto (dialog mode) | Passkeys, session keys, no extension, persists accounts in IndexedDB |
| Player identity | Formatted addresses | Prevents griefing via offensive names |

### Why EIP-2612 Permit (Not EIP-3009)

EIP-3009 `receiveWithAuthorization` was the original approach, but is **incompatible with Porto smart wallets**:

- Porto uses P256/WebAuthn passkeys — signatures are wrapped with key metadata: `encodePacked([signature, keyHash, prehash])` (33 extra bytes)
- EIP-3009 uses `ecrecover` (secp256k1 only) — the wrapped signature causes `parseSignature()` to fail with `"Invalid yParityOrV value"`
- AUSD's `isReceiveWithAuthorizationUpgraded` is `false` on-chain, meaning `receiveWithAuthorization` does NOT support EIP-1271

AUSD's `permit` function uses `SignatureCheckerLib.isValidSignatureNow` which supports **both** `ecrecover` AND EIP-1271. Since Porto accounts implement EIP-1271 via their EIP-7702 delegate, the `permit(address,address,uint256,uint256,bytes)` overload works with Porto's wrapped P256 signatures.

**Better UX too:** sign once (infinite approval), play forever — vs EIP-3009 which required signing before every game.

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Next.js 14 (App Router) | Fullstack, Vercel-native |
| Wallet | Porto | Passkey auth, session keys, works with wagmi/viem |
| Web3 | wagmi v2 + viem | Porto-compatible, typed, modern |
| Contracts | Foundry | Fast tests, modern tooling |
| Styling | Tailwind CSS | Rapid iteration |
| Chain | Arbitrum Sepolia | Porto-compatible, fast L2 testnet |
| Hosting | Vercel | Easy deployment, edge functions |

**No database required** - all state lives on-chain.

## Smart Contract

### AgoRace.sol

The contract uses a pay-per-attempt model via `approve` + `safeTransferFrom`. Players approve infinite AUSD allowance once (via Porto's gas-sponsored tx), and the server calls `submitAttempt` which pulls payment automatically.

```solidity
// Key functions:

/// @notice Submit attempt — pulls payment via safeTransferFrom
function submitAttempt(
    address _player,
    uint256 _score
) external onlyOperator whenActive {
    // Pull payment from player (requires prior approve)
    IERC20(address(token)).safeTransferFrom(_player, address(this), ATTEMPT_FEE);
    pot += ATTEMPT_FEE;

    // Auto-register on first attempt
    if (!_state.hasPlayed) {
        _state.hasPlayed = true;
        _ps.players.push(_player);
    }

    // Update best score if improved
    if (_score > _state.bestScore) _state.bestScore = uint32(_score);
}
```

### Score Encoding

Scores are stored as integers scaled by 100 to preserve 2 decimal places:
- `76.50` score -> stored as `7650`
- Frontend divides by 100 for display

## Typing Interface

### Scoring Logic (Client-Side)

```typescript
interface TypingResult {
  wpm: number;           // Words per minute (word = 5 characters)
  accuracy: number;      // Percentage (0-100)
  score: number;         // wpm * accuracy / 100
  scoreEncoded: number;  // score * 100 (for contract)
  timeMs: number;
  correctChars: number;
  totalChars: number;
}
```

### UI States

1. **Not Connected** - Show Porto "Connect" button
2. **Connected, Active Competition** - Show "Start Typing" button
3. **Checking** - Reading allowance from chain
4. **Approving (one-time)** - Sending approve tx via Porto (gas-sponsored) — skipped on subsequent plays
5. **Playing** - Show typing interface with live WPM/accuracy
6. **Submitting** - Show "Recording score..." (server submitting tx)
7. **Completed** - Show results, leaderboard position, "Play Again" button
8. **Competition Ended** - Show final leaderboard, winner announcement

## Implementation Phases

### Phase 1: MVP
- [x] Foundry project setup
- [x] AgoRace contract with signup model
- [x] Mock AUSD token for testnet
- [x] Comprehensive test suite
- [x] Deploy to Arbitrum Sepolia (using deploy-framework)
- [x] Next.js 14 app scaffold (in `frontend/`)
- [x] Porto integration for wallet connection
- [x] Basic typing UI (passage display, input, timer, live WPM/accuracy)
- [x] Score calculation (client-side)
- [x] Signup flow (approve + signup with loading states)
- [x] Server endpoint to submit attempts (POST /api/submit-attempt)
- [x] Basic leaderboard (polling from contract)
- [x] Redeploy contract with MockAUSD
- [x] Start competition + test signups

### Phase 1.5: Pay-Per-Attempt + Remove Names
- [x] Remove player names (prevent griefing via offensive names)
- [x] Replace one-time signup with per-attempt payment via EIP-3009
- [x] Use real AUSD with receiveWithAuthorization
- [x] Fork-based tests against Arbitrum Sepolia
- [x] Update frontend for gasless sign-before-play flow

### Phase 1.6: Porto Compatibility (EIP-2612 Permit)
- [x] Replace EIP-3009 with EIP-2612 permit + safeTransferFrom
- [x] Simplify submitAttempt to 2 params (player, score)
- [x] One-time infinite approval via permit (better UX)
- [x] Frontend: useApprove + useAllowance hooks
- [x] API route: simplified submitAttempt (no permit)
- [x] Redeploy contract (v3.0.0)

### Phase 1.7: Porto Dialog Mode + Account Persistence
- [x] Switch from `Mode.relay()` to dialog mode (Porto's default)
- [x] Simplify ConnectButton — dialog handles create-vs-sign-in UI
- [x] Add CORS + Private Network Access headers to merchant route
- [ ] **Merchant sponsoring via dialog mode** — blocked by Chrome PNA (see TODO.md session 2026-02-16)
  - Workaround: Porto's built-in Faucet button for approval tx gas
  - Expected to work in production (non-localhost merchant URL)

### Phase 2: Production Ready
- [ ] Proper error handling + loading states
- [ ] Transaction status feedback
- [ ] Better typing UX (character highlighting, error indication)
- [ ] Countdown timer to competition end
- [ ] Event indexing for faster leaderboard (or subgraph)
- [ ] Admin UI for starting/settling competitions
- [ ] Gas estimation and operator balance monitoring

### Phase 3: Polish
- [ ] Mobile responsive design
- [ ] Animations (score reveal, leaderboard updates)
- [ ] Social sharing (Twitter card with score)
- [ ] Historical competitions view
- [ ] Player profiles (total attempts, best scores across competitions)
- [ ] Keystroke recording for anti-cheat audits (future)

## Deployed Contracts (Arbitrum Sepolia)

| Contract | Address |
|----------|---------|
| AgoRaceProxy | `0x5e3b4d6B110428E716DE572786Ed85d301bdd93a` |
| AgoRaceImpl | `0x60fC94Ee5efa8FAFF8c8Cd163f45Af19E6316a05` |
| AgoRaceProxyAdmin | `0xEa1447B8D41474eE4BDfF1C1fAa80Fb5C9F8e958` |
| AUSD (AgoraDollar) | `0xa9012a055bd4e0edff8ce09f960291c09d5322dc` |
| AUSD Role Holder | `0x99B0E95Fa8F5C3b86e4d78ED715B475cFCcf6E97` |

**Deployment Details:**
- Chain ID: 421614 (Arbitrum Sepolia)
- Owner/Operator: `0xb07eFD484Baf4E53767da2C00dd31D61840496a7`
- Block Explorer: `https://sepolia.arbiscan.io`

## Environment Variables

See `.env.example` and `SETUP.md` for full configuration.

```bash
# Key variables
RPC_API_ENDPOINT=<alchemy_api_key>
SERVER_ADDRESS=0xb07eFD484Baf4E53767da2C00dd31D61840496a7
SERVER_PK=<private_key>
NEXT_PUBLIC_CHAIN_ID=421614  # Arbitrum Sepolia
```

## Gas Costs (Estimated)

| Operation | Gas | Cost (at 0.01 gwei) |
|-----------|-----|---------------------|
| submitAttempt() | ~100k | ~$0.002 |
| settle() | ~100k + 20k/player | ~$0.01-0.05 |

**Operator cost per competition:**
- 100 attempts = ~$0.20 in gas (approve is user-side via Porto)
- 1000 attempts = ~$2.00 in gas

## Known Issues

### Chrome Private Network Access vs Merchant Sponsoring (Local Dev)

Porto's dialog mode runs in an iframe hosted at `https://id.porto.sh`. When the iframe calls our merchant endpoint (`https://localhost:3000/api/porto/merchant`), Chrome blocks the request under its **Private Network Access** (PNA) policy — a public origin (`id.porto.sh`) cannot fetch a loopback address (`localhost`), regardless of CORS headers.

**What we tried (all failed for localhost):**
1. **HTTPS local dev** (`next dev --experimental-https`) — PNA still blocks; HTTPS doesn't change the address space classification
2. **CORS + PNA response headers** (`Access-Control-Allow-Private-Network: true`) — Server returns correct headers (verified via curl), but Chrome rejects the preflight before evaluating them
3. **mkcert** (locally-trusted certificate) — Chrome still classifies `localhost` as loopback address space, regardless of cert trust

**Root cause:** Chrome's PNA enforcement for loopback is stricter than general private-network. The browser blocks at the address-space level, not at the TLS or CORS level. Porto only supports `merchantUrl` as a string URL (no function-based callback), so there's no way to proxy the merchant request through the parent page's same-origin context.

**Current workaround:** Porto's built-in Faucet button in the dialog UI funds the approval transaction gas. The merchant endpoint code is in place and functional (tested via curl) — it's only blocked by Chrome's PNA in local dev.

**Production:** This is a localhost-only problem. When deployed to a public domain (e.g., Vercel), the merchant endpoint will be at `https://agorace.example.com/api/porto/merchant`, which is a public-to-public request — no PNA restriction.

**Previously tried relay mode** (`Mode.relay()`): The merchant endpoint worked in relay mode (relay routes the request differently), but relay mode doesn't persist accounts in the browser — every page reload disconnects the wallet. Dialog mode was chosen for persistence.

## Future Considerations

### Anti-Cheat (Phase 3+)
- Record all keystrokes with timestamps
- Server replays and verifies score matches
- Store keystroke hash on-chain for audit trail

### Merkle Proof Settlement
- Build merkle tree of all attempts off-chain
- Submit root at settlement for historical verification
- Anyone can prove their attempt was included

### Multiple Concurrent Competitions
- Parameterize contract by competition ID
- Or deploy new contract per competition (simpler)

### Prize Tiers
- Top 3 split: 60% / 30% / 10%
- Requires tracking top N instead of just highest
