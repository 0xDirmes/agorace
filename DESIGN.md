# Agora Type - Design Document

Weekly typing competition with on-chain prize pool. Fully on-chain architecture with Porto for seamless UX.

## Overview

A week-long typing tournament where players sign up with a one-time entry fee for unlimited attempts. The player with the highest score (WPM × accuracy%) at the end of the week wins the entire pot. All attempts are recorded on-chain for public verifiability.

## Game Rules

| Parameter | Value |
|-----------|-------|
| Entry fee | 10 AUSD one-time signup (unlimited attempts) |
| Duration | 7 days (hardcoded) |
| Text | Same passage for entire competition |
| Scoring | `WPM × accuracy%` (e.g., 80 WPM at 95% = 76.0) |
| Winner | Single winner, takes 100% of pot |
| Ties | First player to reach the highest score wins |
| Settlement | Owner-triggered at competition end |

## User Flow

```
1. Connect wallet via Porto (passkey-based, no extension needed)
2. View leaderboard + current pot size + time remaining
3. Sign up with 10 AUSD (one-time fee, unlimited attempts)
4. Click "Play" → typing test starts immediately (no wallet popup)
5. Type the passage as fast and accurately as possible
6. Score calculated → server submits attempt on-chain (sponsored)
7. See results: WPM, accuracy, final score, leaderboard position
8. Play again instantly (no additional fee)
9. At week end: owner settles, winner receives entire pot
```

## Architecture

### Fully On-Chain Model

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 14)                    │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Typing UI   │  │  Leaderboard │  │  Porto Wallet    │   │
│  │  - Passage   │  │  - Rankings  │  │  - Connect       │   │
│  │  - Input     │  │  - Your best │  │  - Sign Up       │   │
│  │  - Live WPM  │  │  - Pot size  │  │  - Status        │   │
│  │  - Accuracy  │  │  - Time left │  │                  │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Routes (Next.js)                      │
│                                                              │
│  POST /api/submit-attempt                                    │
│    - Receive score from client                               │
│    - Server signs + submits tx to contract (sponsored)       │
│    - Return tx hash + updated leaderboard position           │
│                                                              │
│  GET /api/competition                                        │
│    - Read contract state (pot, endTime, active)              │
│    - Return leaderboard (from contract events or indexer)    │
│                                                              │
│  POST /api/admin/settle (protected)                          │
│    - Trigger settlement on contract                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Smart Contract (On-Chain)                 │
│                                                              │
│  State:                                                      │
│    - playerState: mapping(address => PlayerState)            │
│        - bestScore: uint32                                   │
│        - signedUp: bool                                      │
│    - players: address[] (for settlement iteration)           │
│    - pot: uint256                                            │
│    - startTime, endTime, settled                             │
│                                                              │
│  Functions:                                                  │
│    - signup() → user pays 10 AUSD, gets unlimited attempts   │
│    - submitAttempt(player, score) → operator submits score   │
│    - settle() → owner pays winner                            │
│    - getLeaderboard() → returns all players + scores         │
│                                                              │
│  Events:                                                     │
│    - SignedUp(player, pot)                                   │
│    - AttemptSubmitted(player, score, bestScore, pot)         │
│    - Settled(winner, prize)                                  │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data storage | Fully on-chain | Public verifiability, no DB needed |
| Attempt submission | Server-sponsored | User doesn't pay gas, seamless UX |
| Score calculation | Client-side (MVP) | Trusted for now, auditable later |
| Winner calculation | On-chain iteration | Contract finds highest score at settlement |
| Wallet | Porto | Passkeys, session keys, no extension |

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Next.js 14 (App Router) | Fullstack, Vercel-native |
| Wallet | Porto | Passkey auth, session keys, works with wagmi/viem |
| Web3 | wagmi v2 + viem | Porto-compatible, typed, modern |
| Contracts | Foundry | Fast tests, modern tooling |
| Styling | Tailwind CSS | Rapid iteration |
| Chain | Monad Testnet | Fast, EVM-compatible |
| Hosting | Vercel | Easy deployment, edge functions |

**No database required** - all state lives on-chain.

## Smart Contract

### AgoraType.sol

The contract uses a simplified signup model where players pay a one-time entry fee for unlimited attempts.

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AgoraType is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;

    uint256 public constant ENTRY_FEE = 10e6;  // 10 AUSD (6 decimals)
    uint256 public constant DURATION = 7 days;

    // Competition state
    uint256 public startTime;
    uint256 public endTime;
    uint256 public pot;
    bool public settled;
    address public operator;

    // Player state (packed into single storage slot)
    struct PlayerState {
        uint32 bestScore;
        bool signedUp;
    }
    mapping(address => PlayerState) public playerState;
    address[] public players;

    // Events
    event CompetitionStarted(uint256 startTime, uint256 endTime);
    event SignedUp(address indexed player, uint256 pot);
    event AttemptSubmitted(address indexed player, uint256 score, uint256 bestScore, uint256 pot);
    event Settled(address indexed winner, uint256 prize);

    // Errors
    error AlreadySettled();
    error AlreadySignedUp();
    error CompetitionActive();
    error CompetitionNotActive();
    error CompetitionNotEnded();
    error NoPlayers();
    error NotOperator();
    error NotSignedUp();

    modifier onlyOperator() {
        if (msg.sender != operator && msg.sender != owner()) revert NotOperator();
        _;
    }

    modifier whenActive() {
        if (block.timestamp < startTime || block.timestamp >= endTime || settled)
            revert CompetitionNotActive();
        _;
    }

    constructor(address _token, address _operator) Ownable(msg.sender) {
        token = IERC20(_token);
        operator = _operator;
    }

    // ============ Player Functions ============

    /// @notice Sign up for the competition (one-time fee, unlimited attempts)
    function signup() external whenActive {
        PlayerState storage state = playerState[msg.sender];
        if (state.signedUp) revert AlreadySignedUp();

        token.safeTransferFrom(msg.sender, address(this), ENTRY_FEE);
        pot += ENTRY_FEE;
        state.signedUp = true;
        players.push(msg.sender);

        emit SignedUp(msg.sender, pot);
    }

    // ============ Operator Functions ============

    /// @notice Submit an attempt on behalf of a player (server-sponsored)
    function submitAttempt(address player, uint256 score) external onlyOperator whenActive {
        PlayerState storage state = playerState[player];
        if (!state.signedUp) revert NotSignedUp();

        if (score > state.bestScore) state.bestScore = uint32(score);

        emit AttemptSubmitted(player, score, state.bestScore, pot);
    }

    // ============ Admin Functions ============

    function startCompetition() external onlyOwner {
        if (startTime != 0 && !settled) revert CompetitionActive();

        startTime = block.timestamp;
        endTime = block.timestamp + DURATION;
        settled = false;

        // Clear previous players
        for (uint i = 0; i < players.length; i++) {
            delete playerState[players[i]];
        }
        delete players;

        emit CompetitionStarted(startTime, endTime);
    }

    function settle() external onlyOwner {
        if (block.timestamp < endTime) revert CompetitionNotEnded();
        if (settled) revert AlreadySettled();
        if (players.length == 0) revert NoPlayers();

        // Find winner (first to reach highest score wins ties)
        address winner;
        uint256 highestScore;
        for (uint i = 0; i < players.length; i++) {
            uint256 score = playerState[players[i]].bestScore;
            if (score > highestScore) {
                highestScore = score;
                winner = players[i];
            }
        }

        settled = true;
        uint256 prize = pot;
        pot = 0;

        token.safeTransfer(winner, prize);
        emit Settled(winner, prize);
    }

    // ============ View Functions ============

    function getLeaderboard() external view returns (address[] memory, uint256[] memory) {
        address[] memory _players = new address[](players.length);
        uint256[] memory _scores = new uint256[](players.length);
        for (uint i = 0; i < players.length; i++) {
            _players[i] = players[i];
            _scores[i] = playerState[players[i]].bestScore;
        }
        return (_players, _scores);
    }
}
```

### Score Encoding

Scores are stored as integers scaled by 100 to preserve 2 decimal places:
- `76.50` score → stored as `7650`
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

function calculateScore(
  targetText: string,
  typedText: string,
  timeMs: number
): TypingResult {
  const totalChars = targetText.length;
  let correctChars = 0;

  for (let i = 0; i < Math.min(targetText.length, typedText.length); i++) {
    if (targetText[i] === typedText[i]) {
      correctChars++;
    }
  }

  const accuracy = (correctChars / totalChars) * 100;
  const minutes = timeMs / 60000;
  const words = totalChars / 5;  // Standard: 1 word = 5 chars
  const wpm = Math.round(words / minutes);
  const score = (wpm * accuracy) / 100;
  const scoreEncoded = Math.round(score * 100);  // For contract storage

  return {
    wpm,
    accuracy: Math.round(accuracy * 100) / 100,
    score: Math.round(score * 100) / 100,
    scoreEncoded,
    timeMs,
    correctChars,
    totalChars
  };
}
```

### UI States

1. **Not Connected** - Show Porto "Connect" button
2. **Connected, Not Signed Up** - Show "Sign Up (10 AUSD)" button
3. **Connected, Signed Up, Active Competition** - Show "Play" button
4. **Playing** - Show typing interface with live WPM/accuracy
5. **Submitting** - Show "Recording score..." (server submitting tx)
6. **Completed** - Show results, leaderboard position, "Play Again" button
7. **Competition Ended** - Show final leaderboard, winner announcement

## Implementation Phases

### Phase 1: MVP
- [x] Foundry project setup
- [x] AgoraType contract with signup model
- [x] Mock AUSD token for testnet
- [x] Comprehensive test suite
- [ ] Deploy to testnet
- [ ] Next.js app scaffold
- [ ] Porto integration for wallet connection
- [ ] Basic typing UI (passage display, input, timer)
- [ ] Score calculation
- [ ] Signup flow (approve + signup)
- [ ] Server endpoint to submit attempts (sponsored tx)
- [ ] Basic leaderboard (read from contract)
- [ ] Manual settlement via script

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

## Sample Typing Passage (Placeholder)

```
The quick brown fox jumps over the lazy dog. This pangram contains every letter
of the English alphabet at least once. Typing tests have been used for decades
to measure typing speed and accuracy. The average typing speed is around 40 words
per minute, while professional typists can exceed 80 words per minute. Practice
and proper finger placement are key to improving your typing skills.
```

~180 characters, ~36 words. Will be replaced with final passage.

## Environment Variables

See `.env.example` and `SETUP.md` for full configuration.

```bash
# Key variables
RPC_ENDPOINT=https://monad-testnet.g.alchemy.com/v2/<API_KEY>
SERVER_ADDRESS=0xb07eFD484Baf4E53767da2C00dd31D61840496a7
SERVER_PK=<private_key>
NEXT_PUBLIC_CHAIN_ID=10143  # Monad Testnet
```

## Gas Costs (Estimated for Base)

| Operation | Gas | Cost (at 0.01 gwei) |
|-----------|-----|---------------------|
| signup() | ~80k | ~$0.002 |
| submitAttempt() | ~50k | ~$0.001 |
| settle() | ~100k + 20k/player | ~$0.01-0.05 |

**Operator cost per competition:**
- 100 attempts = ~$0.10 in gas (submitAttempt only, signup paid by user)
- 1000 attempts = ~$1.00 in gas

Acceptable for a side project. The one-time signup model reduces operator costs since users pay their own signup gas.

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
