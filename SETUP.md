# Agora Type - Setup & Deployment Guide

## Chain Configuration

**Network:** Monad Testnet

| Parameter | Value |
|-----------|-------|
| Chain ID | 10143 |
| RPC | `https://monad-testnet.g.alchemy.com/v2/<API_KEY>` |
| Currency | MON |

## Reference Repositories

Clone these for reference during implementation:

```bash
# Porto - for wallet integration patterns
git clone https://github.com/ithacaxyz/porto lib/porto

# Solidity template - base for contract structure
# (Use as template, don't clone into lib)
# https://github.com/amphora-atlas/solidity-template
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in `RPC_ENDPOINT` with Alchemy API key
3. Fill in `SERVER_PK` (private key for operator wallet)

**Server wallet:** `0xb07eFD484Baf4E53767da2C00dd31D61840496a7`
- Pre-seeded with testnet funds
- Used to sponsor `submitAttempt` transactions

## Deployment Checklist

### 1. Contract Deployment

```bash
# Order matters - token first, then AgoraType

# 1. Deploy MockAUSD token (or use existing if available)
forge script script/deploy/DeployMockAUSD.s.sol --rpc-url $RPC_ENDPOINT --broadcast

# 2. Deploy AgoraType with token address and operator
forge script script/deploy/DeployAgoraType.s.sol --rpc-url $RPC_ENDPOINT --broadcast
```

### 2. Post-Deployment

- [ ] Update `.env` with deployed contract addresses
- [ ] Update `NEXT_PUBLIC_*` vars for frontend
- [ ] Verify contracts on block explorer (if supported)
- [ ] Mint test tokens to SERVER_ADDRESS for testing
- [ ] Call `startCompetition()` to begin first competition

### 3. Frontend Deployment

```bash
# Build and deploy to Vercel
cd frontend  # or wherever Next.js app lives
vercel --prod
```

## Foundry Configuration

Add to `foundry.toml`:

```toml
[rpc_endpoints]
monad_testnet = "${RPC_ENDPOINT}"

[etherscan]
monad_testnet = { key = "", url = "" }  # Update when explorer available
```

## Testing Locally

```bash
# Run contract tests
FOUNDRY_PROFILE=test forge test

# Run specific test file
FOUNDRY_PROFILE=test forge test --match-path src/test/agora-type/TestDeposit.t.sol

# Run with verbosity
FOUNDRY_PROFILE=test forge test -vvv
```

## Manual Testing Flow

1. **Start competition**
   ```bash
   cast send $AGORATYPE_ADDRESS "startCompetition()" --rpc-url $RPC_ENDPOINT --private-key $SERVER_PK
   ```

2. **Mint tokens to test user**
   ```bash
   cast send $TOKEN_ADDRESS "mint(address,uint256)" <USER_ADDRESS> 10000000000000000000 --rpc-url $RPC_ENDPOINT --private-key $SERVER_PK
   ```

3. **Check competition state**
   ```bash
   cast call $AGORATYPE_ADDRESS "getState()" --rpc-url $RPC_ENDPOINT
   ```

## Troubleshooting

**"Insufficient deposit" error**
- User needs to call `deposit()` before playing
- Check token approval: `token.approve(agoraType, amount)`

**"Competition not active" error**
- Owner needs to call `startCompetition()` first
- Check if competition has ended (7 days passed)

**Transaction failing silently**
- Check SERVER_ADDRESS has enough MON for gas
- Verify RPC endpoint is correct
