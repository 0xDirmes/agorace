# Agora Type - Implementation Todo List

Phase 1 (MVP) implementation checklist. Check items off as completed.

**Important References:**
- `DESIGN.md` - Architecture and contract design
- `STYLE_GUIDE.md` - Solidity style conventions (natspec, testing, structure)

## Smart Contracts (Foundry)

- [x] Initialize Foundry project from [solidity-template](https://github.com/amphora-atlas/solidity-template)
  - Clone template, update names, configure for Monad Testnet
  - Follow structure: `src/contracts/`, `src/test/`, `src/script/`
- [x] Write AgoRace.sol contract (see DESIGN.md for spec)
  - Follow natspec and section comment style from STYLE_GUIDE.md
  - Include Version struct, events, custom errors
- [x] Write IAgoRace.sol interface
- [x] Write MockAUSD.sol token for testnet
- [x] Write BaseTest.sol with shared test setup
- [x] Write contract tests following agora-dollar style:
  - `TestSignup.t.sol`
  - `TestSubmitAttempt.t.sol`
  - `TestSettle.t.sol`
- [x] Deploy contracts to Monad Testnet (using deploy-framework)
- [x] Fix CREATE3 ownership bug (added `initialOwner` to ConstructorParams)
- [x] Add player names feature (removed in v2 — see session 2026-02-14)
- [x] Pay-per-attempt with EIP-3009 `receiveWithAuthorization` (1 AUSD per attempt)
- [x] Fork-based tests against real AUSD on Arbitrum Sepolia

## Frontend (Next.js 14) ✅ COMPLETE

- [x] Initialize Next.js 14 app with App Router (`frontend/`)
- [x] Set up Tailwind CSS with custom Agora theme
- [x] Integrate Porto for wallet connection (passkey-based)
- [x] Set up wagmi v3 + viem with contract ABIs
- [x] Build typing test component (passage display, character highlighting, timer)
- [x] Implement score calculation logic (WPM × accuracy)
- [x] Build leaderboard component with polling (15s interval)
- [x] Build competition status display (pot, time remaining, player count)
- [x] Build signup flow (approve + signup with loading states)
- [x] Build POST /api/submit-attempt endpoint (server-sponsored tx)
- [x] Assemble home page and play page

**Frontend structure:**
```
frontend/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Home/landing page
│   ├── play/page.tsx           # Typing game page
│   └── api/submit-attempt/     # Server-sponsored submission
├── components/
│   ├── providers/WagmiProvider.tsx
│   ├── wallet/ConnectButton.tsx
│   ├── competition/{CompetitionStatus,Leaderboard}.tsx
│   └── typing/{TypingGame,PassageDisplay,LiveStats,Results}.tsx
├── hooks/
│   ├── useCompetitionState.ts  # Polls contract state (30s)
│   ├── useLeaderboard.ts       # Polls leaderboard (15s)
│   ├── usePlayerState.ts       # User signup + best score
│   ├── usePaymentAuth.ts       # EIP-3009 authorization signing
│   └── useSubmitAttempt.ts     # POST to API endpoint
└── lib/
    ├── config.ts               # Wagmi + Porto config
    ├── chains.ts               # Monad testnet definition
    ├── contracts.ts            # Addresses + ABIs
    ├── scoring.ts              # WPM/accuracy calculation
    └── constants.ts            # Passage, intervals
```

---

## Deployed Contracts (Monad Testnet)

| Contract | Address |
|----------|---------|
| AgoRaceProxy | `0x5e3b4d6B110428E716DE572786Ed85d301bdd93a` |
| AgoRaceImpl | `0x60fC94Ee5efa8FAFF8c8Cd163f45Af19E6316a05` |
| AgoRaceProxyAdmin | `0xEa1447B8D41474eE4BDfF1C1fAa80Fb5C9F8e958` |
| MockAUSD | `0x619E7FeC43c5c17aFa0dFAB01787FE1E85e39398` |

**Owner/Operator:** `0xb07eFD484Baf4E53767da2C00dd31D61840496a7`

---

## Integration & Testing

- [x] Start competition using owner wallet
- [x] Test signup flow with player names (Alice, Bob)
- [x] Test score submission
- [x] Verify leaderboard returns names
- [ ] Test full E2E flow in browser:
  - Connect wallet via Porto
  - Enter name + Sign Up
  - Play typing test
  - Submit score (server-sponsored)
  - Verify leaderboard shows name
- [ ] Write settlement script for manual triggering
- [ ] Deploy frontend to Vercel

---

## Build Order (Recommended)

1. ~~**Contracts** - Get on-chain logic locked down first~~ ✅ COMPLETE
2. ~~**Frontend scaffold + wallet** - Prove Porto integration works~~ ✅ COMPLETE
3. ~~**Typing UI standalone** - Can test without blockchain~~ ✅ COMPLETE
4. ~~**Connect everything** - Wire up the full flow~~ ✅ COMPLETE
5. ~~**Redeploy contract** - Fix ownership bug~~ ✅ COMPLETE
6. **End-to-end testing** - Validate on Monad testnet ← NEXT

---

## Future Improvements

- [ ] **Gasless signup** - Players shouldn't need native tokens for gas
  - Porto fee sponsoring implemented but blocked by AUSD storage layout
  - See `docs/porto-balance-slot-research.md` for details
  - Options: Deploy MockAUSD with standard storage OR use wrapper token
- [ ] **AUSD token icon for Porto** — Porto dialog shows broken icon (404 at `https://id.porto.sh/dialog/ui/token-icons/ausd.svg`). Need to submit AUSD icon to Porto team or configure custom token metadata.
- [ ] Event indexing for faster leaderboard (subgraph or custom indexer)
- [ ] Admin UI for starting/settling competitions
- [ ] Mobile responsive design

---

## Session Notes

### 2026-02-14 (Pay-Per-Attempt + Remove Names)

**Completed:**
- Removed player names from contract and frontend (prevent griefing via offensive names)
- Replaced one-time signup (10 AUSD) with per-attempt payment (1 AUSD) via EIP-3009
- `receiveWithAuthorization` pulls payment gaslessly — player signs before playing
- Removed `signup()`, `playerName()`, `SignedUp` event, `AlreadySignedUp`/`NotSignedUp`/`InvalidName` errors
- Removed `playerNames` mapping from storage, renamed `signedUp` -> `hasPlayed`
- `submitAttempt()` now takes EIP-3009 auth params, auto-registers player on first attempt
- `getLeaderboard()` returns `(address[], uint256[])` — no names
- Tests now fork Arbitrum Sepolia and use real AUSD with `vm.sign` for EIP-712 signatures
- Frontend: deleted SignupButton, useSignup; created usePaymentAuth hook
- Play page: sign auth before game, submit seamlessly after
- Leaderboard shows formatted addresses instead of names
- Version bumped to 2.0.0

**Contract changes (AgoRace.sol):**
- `ENTRY_FEE` (10e6) -> `ATTEMPT_FEE` (1e6)
- `IERC20 token` -> `IAgoraDollar token`
- `submitAttempt(player, score, validAfter, validBefore, nonce, v, r, s)`
- `startCompetition()` no longer clears names

**Test changes:**
- Deleted `TestSignup.t.sol`
- `BaseTest.sol` uses `vm.createSelectFork("arbitrum_sepolia")` with real AUSD
- Player accounts use `makeAddrAndKey()` for `vm.sign` support
- Added `_signReceiveWithAuthorization()` and updated `_submitAttempt()` helpers
- 24 tests passing against forked Arbitrum Sepolia

---

### 2026-02-09 (Arbitrum Sepolia)

**Completed:**
- Porto fee sponsoring implementation (merchant route, wagmi config)
- Competition started on AgoRace (Arbitrum Sepolia)
- 9 test players registered with random wallets
- Returned remaining ETH from test wallets to server

**Contracts (Arbitrum Sepolia):**
| Contract | Address |
|----------|---------|
| AgoRace | `0x9dB2392F558332e2D9De36b1F4E4c5118d6df740` |
| AUSD (AgoraDollar) | `0xa9012a055bd4e0edff8ce09f960291c09d5322dc` |
| Server/Operator | `0xb07eFD484Baf4E53767da2C00dd31D61840496a7` |
| Porto Merchant | `0x9070efcA8c87C4F74358D7D704EcBe6FD0e4Bf40` |

**Issue Found:**
Porto fee sponsoring fails with AUSD due to ERC-7201 namespaced storage.
- Error: "could not determine balance slot for 0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC"
- Root cause: AgoraDollar uses ERC-7201 storage at slot `0x455730fed...` instead of slot 0
- Porto cannot be configured for custom balance slots
- Research saved to `docs/porto-balance-slot-research.md`

**Test Leaderboard (9 players):**
- Alice: 12,500 | Bob: 11,200 | Charlie: 10,400
- Diana: 9,100 | Eve: 8,300 | Frank: 7,600
- Grace: 6,800 | Henry: 5,900 | Ivy: 5,200

---

### 2025-02-06

**Completed:**
- Added player names feature to contract and frontend
- Redeployed with MockAUSD (permissionless minting for testnet)
- Started competition, signed up test players (Alice, Bob)
- Verified leaderboard returns names correctly

**Contract changes:**
- `signup(string _name)` - accepts player name (1-32 bytes)
- `getLeaderboard()` returns `(address[], uint256[], string[])`
- Added `playerName(address)` view function
- Added `InvalidName` error
- Removed redundant `bestScore()` and `isPlayer()` functions
- Simplified storage (removed ConfigStorage, moved token to regular storage)

### 2025-02-04

**Completed:**
- Full frontend implementation (7 phases)
- All components, hooks, and API routes
- Build passes with `npm run build`

**Discovered:**
- CREATE3 ownership bug: `msg.sender` during `initialize()` is the CREATE3 minimal proxy, not the deployer
- Fixed by adding explicit `initialOwner` param to `ConstructorParams`

---

## References

- **Design Doc**: `./DESIGN.md`
- **Setup Guide**: `./SETUP.md`
- **Style Guide**: `./STYLE_GUIDE.md`
- **Solidity Template**: https://github.com/amphora-atlas/solidity-template
- **Style Reference**: https://github.com/amphora-atlas/agora-dollar-evm-dev
- **Porto Repo**: https://github.com/ithacaxyz/porto (clone to lib/ for reference)
