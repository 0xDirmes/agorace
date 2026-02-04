# Agora Type - Implementation Todo List

Phase 1 (MVP) implementation checklist. Check items off as completed.

**Important References:**
- `DESIGN.md` - Architecture and contract design
- `STYLE_GUIDE.md` - Solidity style conventions (natspec, testing, structure)

## Smart Contracts (Foundry)

- [ ] Initialize Foundry project from [solidity-template](https://github.com/amphora-atlas/solidity-template)
  - Clone template, update names, configure for Base Sepolia
  - Follow structure: `src/contracts/`, `src/test/`, `src/script/`
- [ ] Write AgoraType.sol contract (see DESIGN.md for spec)
  - Follow natspec and section comment style from STYLE_GUIDE.md
  - Include Version struct, events, custom errors
- [ ] Write IAgoraType.sol interface
- [ ] Write MockAUSD.sol token for testnet
- [ ] Write BaseTest.sol with shared test setup
- [ ] Write contract tests following agora-dollar style:
  - `TestDeposit.t.sol`
  - `TestWithdraw.t.sol`
  - `TestSubmitAttempt.t.sol`
  - `TestSettle.t.sol`
- [ ] Deploy contracts to Base Sepolia

## Frontend Setup (Next.js)

- [ ] Initialize Next.js 14 app with App Router
- [ ] Set up Tailwind CSS
- [ ] Integrate Porto for wallet connection
- [ ] Set up wagmi/viem with contract ABIs

## UI Components

- [ ] Build deposit/withdraw UI components
- [ ] Build typing test component (passage display, input, timer)
- [ ] Implement score calculation logic
- [ ] Build leaderboard UI component
- [ ] Build competition status display (pot, time remaining)

## Backend API

- [ ] Build POST /api/submit-attempt endpoint (operator-sponsored tx)
- [ ] Build GET /api/competition endpoint (contract state + leaderboard)

## Integration

- [ ] Wire up full user flow (connect → deposit → play → see results)
- [ ] Write settlement script for manual triggering
- [ ] Test end-to-end on Base Sepolia
- [ ] Deploy frontend to Vercel

---

## Build Order (Recommended)

1. **Contracts** (1-5) - Get on-chain logic locked down first
2. **Frontend scaffold + wallet** (6-9) - Prove Porto integration works
3. **Typing UI standalone** (11-12) - Can test without blockchain
4. **Connect everything** (10, 13-17) - Wire up the full flow
5. **Deploy + test** (18-20) - Validate on real testnet

---

## References

- **Design Doc**: `./DESIGN.md`
- **Solidity Template**: https://github.com/amphora-atlas/solidity-template
- **Style Reference**: https://github.com/amphora-atlas/agora-dollar-evm-dev
- **Porto Docs**: https://porto.sh/
