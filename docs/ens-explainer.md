# ENS (Ethereum Name Service) Explainer

## What is ENS?

ENS is a decentralized naming system built on Ethereum that maps human-readable names (like `vitalik.eth`) to machine-readable identifiers (like `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`). Think of it as DNS for the blockchain.

Instead of sharing `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`, you can just say "send it to vitalik.eth".

## How Does ENS Work Technically?

ENS has three core components:

### 1. The Registry

The ENS Registry is the central contract that stores all domain ownership information. It maps domain names (as `namehash` values) to their owners and resolvers.

```solidity
// Simplified ENS Registry interface
interface ENSRegistry {
    function owner(bytes32 node) external view returns (address);
    function resolver(bytes32 node) external view returns (address);
    function setResolver(bytes32 node, address resolver) external;
}
```

**Namehash** is a recursive algorithm that converts names to bytes32:

```javascript
// namehash("vitalik.eth")
namehash("") = 0x0000...0000
namehash("eth") = keccak256(namehash("") + keccak256("eth"))
namehash("vitalik.eth") = keccak256(namehash("eth") + keccak256("vitalik"))
```

### 2. Resolvers

Resolvers are separate contracts that store the actual records (addresses, content hashes, text records). The registry just points to them.

```solidity
// Simplified Resolver interface
interface Resolver {
    // Forward resolution: name -> address
    function addr(bytes32 node) external view returns (address);

    // Can also store other data
    function text(bytes32 node, string key) external view returns (string);
    function contenthash(bytes32 node) external view returns (bytes);
}
```

**Forward resolution flow:**
```
"vitalik.eth"
  -> namehash()
  -> Registry.resolver(node)
  -> Resolver.addr(node)
  -> 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

### 3. Reverse Resolution

This is what makes wallets show "vitalik.eth" instead of the raw address.

ENS has a special namespace: `addr.reverse`. Every address has a corresponding reverse record at `<address>.addr.reverse`.

```solidity
// Reverse Resolver interface
interface ReverseResolver {
    // Reverse resolution: address -> name
    function name(bytes32 node) external view returns (string);
}
```

**Reverse resolution flow:**
```
0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
  -> "d8da6bf26964af9d7eed9e03e53415d37aa96045.addr.reverse"
  -> namehash()
  -> Registry.resolver(node)
  -> ReverseResolver.name(node)
  -> "vitalik.eth"
```

## Why Does Vitalik's Address Show as "vitalik.eth"?

Two things must be true:

1. **Forward resolution works**: `vitalik.eth` resolves to `0xd8dA...`
2. **Reverse resolution is set**: The address `0xd8dA...` has a reverse record pointing back to `vitalik.eth`

When a wallet or explorer sees an address, it:
1. Computes `<address>.addr.reverse`
2. Looks up the reverse resolver
3. Calls `name()` to get the ENS name
4. (Optionally) Verifies by doing forward resolution to confirm it matches

This verification step prevents someone from claiming a reverse record for a name they don't own.

```javascript
// Pseudocode for what wallets do
async function getDisplayName(address) {
    const reverseName = await reverseResolver.name(address);
    if (!reverseName) return address;

    // Verify forward resolution matches
    const forwardAddress = await resolver.addr(namehash(reverseName));
    if (forwardAddress.toLowerCase() !== address.toLowerCase()) {
        return address; // Mismatch, don't trust the reverse record
    }

    return reverseName;
}
```

## Why Reverse Resolution Matters

Without reverse resolution, apps would only be able to:
- Take a name as input and resolve it to an address
- Never show the name for a given address

With reverse resolution:
- Block explorers show "vitalik.eth" in transaction histories
- Wallets show ENS names in your contact list
- dApps can greet you by name: "Welcome, vitalik.eth!"

**The user must explicitly set their reverse record.** Owning `vitalik.eth` doesn't automatically set it. You have to call:

```solidity
reverseRegistrar.setName("vitalik.eth");
```

## Other Name Services

ENS isn't the only naming system:

| Service | TLDs | Chain | Notes |
|---------|------|-------|-------|
| ENS | .eth | Ethereum | The OG, most widely supported |
| Unstoppable Domains | .crypto, .nft, .x, etc. | Polygon | NFT-based, no renewals |
| Lens Protocol | .lens | Polygon | Social graph focused |
| SpaceID | .bnb, .arb | Multi-chain | BNB Chain, Arbitrum |
| Bonfida | .sol | Solana | Solana native |

Most wallets and explorers primarily support ENS, with varying support for others.

## Why This Doesn't Exist on Monad Testnet (Yet)

ENS requires:

1. **Deployed infrastructure**: Registry, resolvers, reverse registrar contracts
2. **Frontend/registrar**: UI for users to register and manage names
3. **Ecosystem integration**: Wallets and explorers need to query these contracts

On Monad testnet:
- No official ENS deployment (ENS is Ethereum-specific)
- No equivalent naming service deployed yet
- Even if deployed, wallets/explorers wouldn't know to query it

For a new L1/L2, you'd need:
- Deploy your own naming contracts (or fork ENS)
- Get wallet providers to add support for your chain's naming service
- Build adoption over time

**For AgoRace**: We can't show ENS names for Monad addresses because there's no resolver infrastructure. We'd need to either:
1. Wait for a naming service to launch on Monad
2. Build our own (overkill for a typing game)
3. Just display truncated addresses: `0xd8dA...6045`

Option 3 is the pragmatic choice for now.

## Quick Reference

```solidity
// Key ENS addresses on Ethereum Mainnet
ENS Registry: 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e
Public Resolver: 0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63
Reverse Registrar: 0xa58E81fe9b61B5c3fE2AFD33CF304c454AbFc7Cb

// To resolve a name (ethers.js v6)
const address = await provider.resolveName("vitalik.eth");

// To reverse resolve an address
const name = await provider.lookupAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
```
