# AgoRace - Setup & Deployment Guide

## Chain Configuration

**Network:** Arbitrum Sepolia

| Parameter | Value |
|-----------|-------|
| Chain ID | 421614 |
| RPC | `https://arb-sepolia.g.alchemy.com/v2/<API_KEY>` |
| Currency | ETH |
| Block Explorer | `https://sepolia.arbiscan.io` |

## Deployed Contracts

| Contract | Address |
|----------|---------|
| AgoRaceProxy | `0x8136A6104839233D90a1df7bBeC4578b3B0b4bfB` |
| AgoRaceImpl | `0x7552BCF0Cae0C528050427C250bf95c176da1674` |
| AgoRaceProxyAdmin | `0xEb32d4e93f9D4ED6873BE6EEd0037B7fD04CAF01` |
| AUSD (AgoraDollar) | `0xa9012a055bd4e0edff8ce09f960291c09d5322dc` |
| AUSD Role Holder | `0x99B0E95Fa8F5C3b86e4d78ED715B475cFCcf6E97` |

**Owner/Operator:** `0xb07eFD484Baf4E53767da2C00dd31D61840496a7`

## Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in `RPC_API_ENDPOINT` with Alchemy API key
3. Fill in `SERVER_PK` (private key for operator wallet)

**Server wallet:** `0xb07eFD484Baf4E53767da2C00dd31D61840496a7`
- Pre-seeded with testnet funds
- Used to sponsor `submitAttempt` transactions

## Deployment Checklist

### 1. Contract Deployment

Contracts are deployed using the deploy-framework submodule. See `src/script/` for deployment scripts.

```bash
# Deploy AgoRace with AUSD token address and operator
forge script src/script/DeployAgoRace.s.sol --rpc-url $RPC_URL --broadcast
```

### 2. Post-Deployment

- [ ] Update `.env` with deployed contract addresses
- [ ] Update `frontend/.env.local` with `NEXT_PUBLIC_*` vars
- [ ] Verify contracts on block explorer (if supported)
- [ ] Call `startCompetition()` to begin first competition

### 3. Frontend Development (HTTPS Required)

Porto dialog mode requires HTTPS for local dev. The dev script uses `--experimental-https`:

```bash
cd frontend
npm run dev    # starts on https://localhost:3000
```

**Note:** Install `mkcert` (`brew install mkcert && mkcert -install`) for trusted local certs. Without it, Next.js falls back to self-signed certs.

**Known limitation:** Porto's merchant sponsoring is blocked by Chrome's Private Network Access policy on localhost (see DESIGN.md "Known Issues"). Use Porto's built-in Faucet for approval tx gas during local dev.

### 4. Frontend Deployment (Production)

```bash
cd frontend
npm run build
vercel --prod
```

Merchant sponsoring works in production — PNA only blocks localhost.

## Foundry Configuration

The `foundry.toml` uses:
```toml
[rpc_endpoints]
arbitrum_sepolia = "https://arb-sepolia.g.alchemy.com/v2/${RPC_API_ENDPOINT}"
```

Tests fork Arbitrum Sepolia to use the real AUSD contract with `receiveWithAuthorization`.

## Testing

Tests require a valid RPC endpoint for forking Arbitrum Sepolia.

```bash
# Run all contract tests (forks Arbitrum Sepolia)
FOUNDRY_PROFILE=test forge test

# Run specific test file
FOUNDRY_PROFILE=test forge test --match-path src/test/ago-race/TestSubmitAttempt.t.sol

# Run with verbosity
FOUNDRY_PROFILE=test forge test -vvv
```

**Note:** Tests use `vm.createSelectFork("arbitrum_sepolia")` which reads from `[rpc_endpoints]` in `foundry.toml`. Ensure `RPC_API_ENDPOINT` is set in your `.env` file.

## Manual Testing Flow

Set up environment variables first:
```bash
export RPC_URL="https://arb-sepolia.g.alchemy.com/v2/<API_KEY>"
export SERVER_PK="<your-private-key>"
export AGORACE_ADDRESS="0x8136A6104839233D90a1df7bBeC4578b3B0b4bfB"
export AUSD_ADDRESS="0xa9012a055bd4e0edff8ce09f960291c09d5322dc"
```

1. **Start competition**
   ```bash
   cast send $AGORACE_ADDRESS "startCompetition()" --rpc-url $RPC_URL --private-key $SERVER_PK
   ```

2. **Check competition state**
   ```bash
   # Get pot size
   cast call $AGORACE_ADDRESS "pot()(uint256)" --rpc-url $RPC_URL

   # Get start/end time
   cast call $AGORACE_ADDRESS "startTime()(uint256)" --rpc-url $RPC_URL
   cast call $AGORACE_ADDRESS "endTime()(uint256)" --rpc-url $RPC_URL

   # Check if settled
   cast call $AGORACE_ADDRESS "settled()(bool)" --rpc-url $RPC_URL
   ```

3. **Get leaderboard**
   ```bash
   cast call $AGORACE_ADDRESS "getLeaderboard()(address[],uint256[])" --rpc-url $RPC_URL
   ```

4. **Check player state**
   ```bash
   # Get player's best score and played status
   cast call $AGORACE_ADDRESS "getPlayerState(address)(uint256,bool)" <PLAYER_ADDRESS> --rpc-url $RPC_URL
   ```

## Troubleshooting

**"CompetitionNotActive" error**
- Owner needs to call `startCompetition()` first
- Or competition has ended (7 days passed)
- Or competition is already settled

**"ExpiredAuthorization" error**
- The EIP-3009 payment authorization has expired (1-hour window)
- Player needs to sign a new authorization

**"UsedOrCanceledAuthorization" error**
- The nonce has already been used
- Each attempt needs a fresh nonce

**"ERC20InsufficientBalance" error**
- Player doesn't have enough AUSD for the attempt fee (1 AUSD)

**Transaction failing silently**
- Check SERVER_ADDRESS has enough ETH for gas
- Verify RPC endpoint is correct
- Check contract addresses are correct
