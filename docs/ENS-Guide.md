# How ENS (Ethereum Name Service) Works

A concise guide to understanding ENS architecture and resolution flow.

---

## What is ENS?

ENS is the decentralized naming system for Ethereum. It maps human-readable names like `alice.eth` to machine-readable addresses like `0x1234...abcd`.

**Core Problem Solved:** Instead of sharing `0x742d35Cc6634C0532925a3b844Bc9e7595f8fE21`, you share `alice.eth`.

---

## The Three Core Components

### 1. Registry
The **Registry** is a single smart contract that stores all domain ownership records. It maps domain names (as hashes) to:
- **Owner** - who controls the domain
- **Resolver** - which contract knows the domain's records
- **TTL** - cache duration

### 2. Registrar
The **Registrar** controls how domains are acquired. For `.eth` domains, this includes:
- Auction/registration logic
- Renewal payments
- Subdomain creation rules

### 3. Resolver
**Resolvers** store the actual records (addresses, content hashes, text records). The registry points to a resolver, and the resolver stores the data.

---

> **[DIAGRAM PROMPT FOR LOVABLE]**
>
> Create an architectural diagram showing ENS's three components:
> - A central "Registry" box at the top
> - "Registrar" box on the left connected to Registry with arrow labeled "controls ownership"
> - "Resolver" box on the right connected to Registry with arrow labeled "stores records pointer"
> - Below Resolver, show example records: "ETH Address", "Content Hash", "Text Records"
> - Use a clean, minimal style with soft blue colors

---

## Name Resolution Flow

When a wallet resolves `alice.eth`:

```
1. Hash the name → namehash("alice.eth") → 0x9c22...
2. Query Registry → "Who is the resolver for 0x9c22...?"
3. Registry returns → Resolver address: 0xABCD...
4. Query Resolver → "What is the ETH address for 0x9c22...?"
5. Resolver returns → 0x742d35Cc6634C0532925a3b844Bc9e7595f8fE21
```

---

> **[DIAGRAM PROMPT FOR LOVABLE]**
>
> Create a sequence diagram showing ENS name resolution:
> - Actors: "User/Wallet", "ENS Registry", "Resolver Contract"
> - Step 1: User sends "alice.eth" to wallet
> - Step 2: Wallet computes namehash
> - Step 3: Wallet queries Registry "resolver(namehash)?"
> - Step 4: Registry returns resolver address
> - Step 5: Wallet queries Resolver "addr(namehash)?"
> - Step 6: Resolver returns the ETH address
> - Step 7: Wallet displays resolved address
> - Use arrows with numbered steps, keep it clean and readable

---

## The Namehash Algorithm

ENS uses **namehash** to convert domain names into 32-byte hashes. This enables:
- Fixed-size storage keys
- Hierarchical ownership (subdomains)
- Privacy (you can't reverse a hash to get the name)

**How it works:**

```
namehash("") = 0x0000...0000 (32 zero bytes)
namehash("eth") = keccak256(namehash("") + keccak256("eth"))
namehash("alice.eth") = keccak256(namehash("eth") + keccak256("alice"))
```

The algorithm processes labels right-to-left, hashing each label and combining with the parent.

---

> **[DIAGRAM PROMPT FOR LOVABLE]**
>
> Create a visual explanation of the namehash algorithm for "alice.eth":
> - Show three boxes stacked vertically representing the recursive computation
> - Top box: "Start: namehash('') = 0x0000...0000"
> - Middle box: "namehash('eth') = keccak256(0x0000...0000 + keccak256('eth'))"
> - Bottom box: "namehash('alice.eth') = keccak256(namehash('eth') + keccak256('alice'))"
> - Use arrows showing the flow from top to bottom
> - Highlight that labels are processed right-to-left (eth first, then alice)

---

## Domain Hierarchy & Subdomains

ENS supports hierarchical names. The owner of `alice.eth` can create unlimited subdomains:

```
alice.eth           → owned by Alice
wallet.alice.eth    → Alice can assign to anyone
nft.alice.eth       → Alice can assign to anyone
```

Each level can have different:
- Owners
- Resolvers
- Records

---

> **[DIAGRAM PROMPT FOR LOVABLE]**
>
> Create a tree diagram showing ENS domain hierarchy:
> - Root node: ".eth TLD" (controlled by ETH Registrar)
> - Second level: "alice.eth" (owned by Alice's address)
> - Third level: Three children - "wallet.alice.eth", "nft.alice.eth", "blog.alice.eth"
> - Show each node with owner address abbreviated (0x1234...)
> - Use a tree structure with connecting lines
> - Add small icons: wallet icon, NFT icon, blog icon for the subdomains

---

## Resolver Records

A resolver can store multiple record types for each name:

| Record Type | Purpose | Example |
|-------------|---------|---------|
| `addr(ETH)` | Ethereum address | `0x742d...fE21` |
| `addr(BTC)` | Bitcoin address | `bc1q...` |
| `contenthash` | IPFS/Swarm content | `ipfs://Qm...` |
| `text(email)` | Email address | `alice@example.com` |
| `text(url)` | Website | `https://alice.com` |
| `text(avatar)` | Profile picture | `eip155:1/erc721:0x.../123` |

---

## Reverse Resolution

ENS also supports **reverse resolution**: given an address, find its name.

```
Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f8fE21
Reverse lookup domain: 742d35...fE21.addr.reverse
Resolves to: alice.eth
```

This enables wallets to display `alice.eth` instead of `0x742d...` when showing transaction history.

---

> **[DIAGRAM PROMPT FOR LOVABLE]**
>
> Create a bidirectional diagram showing forward and reverse resolution:
> - Left side: "alice.eth" with arrow pointing right labeled "Forward Resolution"
> - Right side: "0x742d...fE21"
> - Below: Arrow pointing left labeled "Reverse Resolution"
> - Show the intermediate step for reverse: "742d...fE21.addr.reverse"
> - Use two different colors for forward (blue) and reverse (green) paths

---

## Key Smart Contracts (Mainnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| ENS Registry | `0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e` | Core ownership registry |
| ETH Registrar | `0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85` | .eth domain registration |
| Public Resolver | `0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63` | Default resolver for records |
| Reverse Registrar | `0xa58E81fe9b61B5c3fE2AFD33CF304c454AbFc7Cb` | Reverse resolution setup |

---

## Quick Reference: Resolution in Code

```javascript
// Using ethers.js
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Forward resolution
const address = await provider.resolveName("alice.eth");
// Returns: 0x742d35Cc6634C0532925a3b844Bc9e7595f8fE21

// Reverse resolution
const name = await provider.lookupAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f8fE21");
// Returns: alice.eth
```

---

## Summary

1. **Registry** tracks who owns what (ownership + resolver pointers)
2. **Registrar** controls how names are acquired
3. **Resolver** stores the actual records (addresses, content, text)
4. **Namehash** converts names to 32-byte keys (processed right-to-left)
5. **Subdomains** enable hierarchical naming under any owned domain
6. **Reverse resolution** maps addresses back to names

---

> **[DIAGRAM PROMPT FOR LOVABLE]**
>
> Create a comprehensive summary diagram showing the full ENS ecosystem:
> - Center: Large "ENS Registry" box
> - Top-left: "User" icon with "Registers alice.eth" arrow to ETH Registrar
> - Top-right: "ETH Registrar" connected to Registry
> - Bottom-left: "Wallet App" icon querying for resolution
> - Bottom-right: "Resolver" box with records inside
> - Show the flow: User → Registrar → Registry ← Wallet → Resolver
> - Include small labels for each arrow explaining the interaction
> - Use a clean, professional style suitable for documentation
