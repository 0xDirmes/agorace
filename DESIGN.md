# Agora Type - Design Document

Weekly typing competition with on-chain prize pool. Fully on-chain architecture with Porto for seamless UX.

## Overview

A week-long typing tournament where players deposit AUSD and pay 1 AUSD per attempt. The player with the highest score (WPM × accuracy%) at the end of the week wins the entire pot. All attempts are recorded on-chain for public verifiability.

## Game Rules

| Parameter | Value |
|-----------|-------|
| Entry fee | 1 AUSD per attempt (deducted from deposit) |
| Duration | 7 days (hardcoded) |
| Text | Same passage for entire competition |
| Scoring | `WPM × accuracy%` (e.g., 80 WPM at 95% = 76.0) |
| Winner | Single winner, takes 100% of pot |
| Settlement | Owner-triggered at competition end |

## User Flow

```
1. Connect wallet via Porto (passkey-based, no extension needed)
2. View leaderboard + current pot size + time remaining
3. Deposit AUSD (e.g., 10 AUSD for 10 attempts)
4. Click "Play" → typing test starts immediately (no wallet popup)
5. Type the passage as fast and accurately as possible
6. Score calculated → server submits attempt on-chain (sponsored)
7. See results: WPM, accuracy, final score, leaderboard position
8. Play again instantly (deposit auto-deducted)
9. At week end: owner settles, winner receives pot
10. Withdraw any remaining deposit balance
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
│  │  - Input     │  │  - Your best │  │  - Deposit AUSD  │   │
│  │  - Live WPM  │  │  - Pot size  │  │  - Balance       │   │
│  │  - Accuracy  │  │  - Time left │  │  - Withdraw      │   │
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
│    - deposits: mapping(address => uint256)                   │
│    - bestScore: mapping(address => uint256)                  │
│    - players: address[] (for settlement iteration)           │
│    - pot: uint256                                            │
│    - startTime, endTime, settled                             │
│                                                              │
│  Functions:                                                  │
│    - deposit(amount) → user deposits AUSD                    │
│    - withdraw(amount) → user withdraws unused balance        │
│    - submitAttempt(player, score) → operator submits score   │
│    - settle() → owner pays winner                            │
│    - getLeaderboard() → returns top players + scores         │
│                                                              │
│  Events:                                                     │
│    - Deposited(player, amount, newBalance)                   │
│    - AttemptSubmitted(player, score, newBestScore, pot)      │
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

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AgoraType is Ownable {
    IERC20 public immutable token;

    uint256 public constant ENTRY_FEE = 1e18;  // 1 AUSD (18 decimals)
    uint256 public constant DURATION = 7 days;

    // Competition state
    uint256 public startTime;
    uint256 public endTime;
    uint256 public pot;
    bool public settled;

    // Player state
    mapping(address => uint256) public deposits;
    mapping(address => uint256) public bestScore;
    address[] public players;
    mapping(address => bool) private isPlayer;

    // Operator can submit attempts on behalf of players
    address public operator;

    // Events
    event CompetitionStarted(uint256 startTime, uint256 endTime);
    event Deposited(address indexed player, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed player, uint256 amount, uint256 newBalance);
    event AttemptSubmitted(
        address indexed player,
        uint256 score,
        uint256 bestScore,
        uint256 pot
    );
    event Settled(address indexed winner, uint256 prize);

    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == owner(), "Not operator");
        _;
    }

    modifier whenActive() {
        require(
            block.timestamp >= startTime &&
            block.timestamp < endTime &&
            !settled,
            "Competition not active"
        );
        _;
    }

    constructor(address _token, address _operator) Ownable(msg.sender) {
        token = IERC20(_token);
        operator = _operator;
    }

    // ============ Admin Functions ============

    function startCompetition() external onlyOwner {
        require(startTime == 0 || settled, "Competition active");

        // Reset state for new competition
        startTime = block.timestamp;
        endTime = block.timestamp + DURATION;
        pot = 0;
        settled = false;

        // Clear previous players (gas intensive, consider alternatives for prod)
        for (uint i = 0; i < players.length; i++) {
            bestScore[players[i]] = 0;
            isPlayer[players[i]] = false;
        }
        delete players;

        emit CompetitionStarted(startTime, endTime);
    }

    function setOperator(address _operator) external onlyOwner {
        operator = _operator;
    }

    function settle() external onlyOwner {
        require(block.timestamp >= endTime, "Competition not ended");
        require(!settled, "Already settled");
        require(players.length > 0, "No players");

        // Find winner (highest score)
        address winner;
        uint256 highestScore;
        for (uint i = 0; i < players.length; i++) {
            if (bestScore[players[i]] > highestScore) {
                highestScore = bestScore[players[i]];
                winner = players[i];
            }
        }

        settled = true;
        uint256 prize = pot;
        pot = 0;

        require(token.transfer(winner, prize), "Transfer failed");
        emit Settled(winner, prize);
    }

    // ============ Player Functions ============

    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        deposits[msg.sender] += amount;
        emit Deposited(msg.sender, amount, deposits[msg.sender]);
    }

    function withdraw(uint256 amount) external {
        require(deposits[msg.sender] >= amount, "Insufficient balance");
        deposits[msg.sender] -= amount;
        require(token.transfer(msg.sender, amount), "Transfer failed");
        emit Withdrawn(msg.sender, amount, deposits[msg.sender]);
    }

    // ============ Operator Functions ============

    /// @notice Submit an attempt on behalf of a player (server-sponsored)
    /// @param player The player's address
    /// @param score The calculated score (WPM * accuracy, scaled by 100)
    function submitAttempt(address player, uint256 score) external onlyOperator whenActive {
        require(deposits[player] >= ENTRY_FEE, "Insufficient deposit");

        // Deduct entry fee and add to pot
        deposits[player] -= ENTRY_FEE;
        pot += ENTRY_FEE;

        // Track player if first attempt
        if (!isPlayer[player]) {
            isPlayer[player] = true;
            players.push(player);
        }

        // Update best score if improved
        if (score > bestScore[player]) {
            bestScore[player] = score;
        }

        emit AttemptSubmitted(player, score, bestScore[player], pot);
    }

    // ============ View Functions ============

    function getState() external view returns (
        uint256 _startTime,
        uint256 _endTime,
        uint256 _pot,
        bool _settled,
        bool _active,
        uint256 _playerCount
    ) {
        bool active = block.timestamp >= startTime &&
                      block.timestamp < endTime &&
                      !settled;
        return (startTime, endTime, pot, settled, active, players.length);
    }

    function getPlayerState(address player) external view returns (
        uint256 _deposit,
        uint256 _bestScore,
        bool _hasPlayed
    ) {
        return (deposits[player], bestScore[player], isPlayer[player]);
    }

    function getLeaderboard(uint256 limit) external view returns (
        address[] memory _players,
        uint256[] memory _scores
    ) {
        uint256 count = players.length < limit ? players.length : limit;
        _players = new address[](count);
        _scores = new uint256[](count);

        // Simple copy (not sorted - frontend should sort)
        // For production, consider an off-chain indexer
        for (uint i = 0; i < count; i++) {
            _players[i] = players[i];
            _scores[i] = bestScore[players[i]];
        }
        return (_players, _scores);
    }

    function getPlayerCount() external view returns (uint256) {
        return players.length;
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
2. **Connected, No Deposit** - Show "Deposit AUSD to Play"
3. **Connected, Has Deposit, Active Competition** - Show "Play" button
4. **Playing** - Show typing interface with live WPM/accuracy
5. **Submitting** - Show "Recording score..." (server submitting tx)
6. **Completed** - Show results, leaderboard position, "Play Again" button
7. **Competition Ended** - Show final leaderboard, winner announcement

## Implementation Phases

### Phase 1: MVP
- [ ] Foundry project setup
- [ ] Deploy AgoraType contract to Base Sepolia
- [ ] Mock AUSD token for testnet
- [ ] Next.js app scaffold
- [ ] Porto integration for wallet connection
- [ ] Basic typing UI (passage display, input, timer)
- [ ] Score calculation
- [ ] Deposit/withdraw flow
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
| deposit() | ~50k | ~$0.001 |
| submitAttempt() | ~80k | ~$0.002 |
| settle() | ~100k + 20k/player | ~$0.01-0.05 |

**Operator cost per competition:**
- 100 attempts = ~$0.20 in gas
- 1000 attempts = ~$2.00 in gas

Acceptable for a side project. Consider adding a small fee for sustainability if it scales.

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
