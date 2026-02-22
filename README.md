# AgoRace

Weekly typing competition with an on-chain prize pool on Arbitrum. Type fast, score high, take the pot.

## How it works

1. Connect a wallet via [Porto](https://porto.sh) (passkey-based, no extension needed)
2. Pay 1 AUSD per attempt — all fees go to the prize pool
3. Type the passage as fast and accurately as possible
4. Highest score (`WPM x accuracy%`) at the end of the week wins the entire pot

## Tech stack

- **Contracts**: Solidity, Foundry, upgradeable via ERC-1967 proxy
- **Frontend**: Next.js 15, Tailwind CSS, wagmi/viem
- **Wallet**: Porto (EIP-7702 smart accounts with passkeys)
- **Chain**: Arbitrum Sepolia (testnet)

## Getting started

```bash
# Clone
git clone https://github.com/0xDirmes/agora-type.git
cd agora-type

# Install frontend dependencies
cd frontend
npm install

# Configure environment
cp .env.local.example .env.local
# Fill in SERVER_PK, MERCHANT_ADDRESS, MERCHANT_PRIVATE_KEY

# Run dev server
npm run dev
```

## Contracts

| Contract | Address (Arbitrum Sepolia) |
|----------|---------------------------|
| AgoRace (Proxy) | `0x8136A6104839233D90a1df7bBeC4578b3B0b4bfB` |
| AgoRace (Impl) | `0x7552BCF0Cae0C528050427C250bf95c176da1674` |
| AUSD | `0xa9012a055bd4e0edff8ce09f960291c09d5322dc` |

## Docs

- [Design Document](./DESIGN.md) — architecture, game rules, user flow
- [Setup Guide](./SETUP.md) — deployment and testing instructions

## Author

[@Dirmes1](https://x.com/Dirmes1)
