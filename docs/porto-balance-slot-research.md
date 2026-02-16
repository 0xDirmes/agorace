# Porto Balance Slot Research

**Date:** 2026-02-09
**Status:** On Hold
**Issue:** Porto fee sponsoring fails with AUSD token

## Problem

Porto fee sponsoring fails with error:
```
Relay error: could not determine balance slot for 0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC
```

## Root Cause

### Expected vs Actual Storage Layout

| Aspect | Standard ERC20 (Porto expects) | AgoraDollar (AUSD) |
|--------|-------------------------------|-------------------|
| Balance slot | **0** | `0x455730fed596673e69db1907be2e521374ba893f1a04cc5f5dd931616cd6b700` |
| Balance type | `uint256` | `uint248` (packed with frozen flag) |
| Structure | `_balances[address]` | `accountData[address].balance` inside struct |
| Pattern | Direct storage | ERC-1967 proxy + ERC-7201 namespaced storage |

### Why Porto Fails

1. Porto probes for balances at standard slots (0-3)
2. AgoraDollar uses **ERC-7201 namespaced storage** at a computed slot
3. Balance is `uint248` packed with `bool isFrozen` in a struct:
   ```solidity
   struct Erc20AccountData {
       bool isFrozen;      // bit 248+
       uint248 balance;    // bits 0-247
   }
   ```
4. Porto cannot introspect custom storage layouts dynamically

### ERC-7201 Storage Slot Computation

AgoraDollar's balance slot is computed as:
```
keccak256(abi.encode(uint256(keccak256("AgoraDollarErc1967Proxy.Erc20CoreStorage")) - 1)) & ~bytes32(uint256(0xff))
= 0x455730fed596673e69db1907be2e521374ba893f1a04cc5f5dd931616cd6b700
```

## Can Porto Be Configured for AUSD?

**No.** Porto has no configuration for custom balance slots:
- No `balanceSlot` option in token config
- No ERC-7201 support listed
- Token schema only accepts: `address`, `decimals`, `symbol`, `uid`, `feeToken`
- Balance detection is hardcoded to standard ERC20 assumptions

## Solution Options

### Option 1: Deploy Simple MockAUSD (Recommended)

Deploy the existing `MockAUSD.sol` which uses standard OpenZeppelin ERC20 storage.

**Pros:**
- Simple, works immediately
- Uses standard slot 0 for balances
- No external dependencies

**Cons:**
- Different contract from production AUSD
- Need to update frontend address

### Option 2: Deploy AUSD Wrapper Token

Create a wrapper that implements standard ERC20 but delegates to AUSD.

```solidity
contract AUSDWrapper is ERC20 {
    IERC20 public immutable ausd;

    constructor(address _ausd) ERC20("Wrapped AUSD", "wAUSD") {
        ausd = IERC20(_ausd);
    }

    function deposit(uint256 amount) external {
        ausd.transferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        _burn(msg.sender, amount);
        ausd.transfer(msg.sender, amount);
    }
}
```

**Pros:**
- Works with real AUSD under the hood
- Standard storage layout for Porto

**Cons:**
- Users must wrap/unwrap tokens
- Additional contract complexity
- Extra gas for wrap/unwrap operations

### Option 3: Contact Porto Team

Request ERC-7201 support or custom token configuration.

**Cons:** Unknown timeline, depends on external team

### Option 4: Skip Fee Sponsoring

Users pay their own gas fees.

**Cons:** Defeats purpose of sponsoring

## Technical Details

### Standard ERC20 Storage (OpenZeppelin)

```solidity
// Storage Layout:
// Slot 0: mapping(address => uint256) _balances
// Slot 1: mapping(address => mapping(address => uint256)) _allowances
// Slot 2: uint256 _totalSupply
// Slot 3: string _name
// Slot 4: string _symbol

// Balance slot for address X:
// keccak256(abi.encodePacked(X, uint256(0)))
```

### AgoraDollar Storage (ERC-7201 Namespaced)

```solidity
// ERC-1967 proxy slots:
// 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc (implementation)
// 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103 (admin)

// ERC-7201 namespaced storage:
// 0x455730fed... (Erc20CoreStorage - balances, allowances, totalSupply)
// 0xbb0a37da... (Eip3009Storage)
// 0x69e87f5b... (Erc2612Storage)

// Balance is stored as:
struct Erc20AccountData {
    bool isFrozen;      // Whether account is frozen
    uint248 balance;    // 248-bit balance (NOT 256!)
}
// Accessed via: accountData[address].balance
```

## Porto Package Analysis

Porto npm package (v0.2.37) token configuration:
- `address` - Token contract address
- `decimals` - Token decimals
- `feeToken` - Whether token can be used for fees
- `interop` - Whether token is interoperable
- `nativeRate` - Native rate conversion
- `symbol` - Token symbol
- `uid` - Unique identifier

**No `balanceSlot` or storage layout configuration exists.**

## References

- Porto SDK: https://porto.sh/sdk
- Porto GitHub: https://github.com/ithacaxyz/porto
- ERC-7201: https://eips.ethereum.org/EIPS/eip-7201
- ERC-1967: https://eips.ethereum.org/EIPS/eip-1967
