# Agora Type - Solidity Style Guide

Style conventions derived from [agora-dollar-evm-dev](https://github.com/amphora-atlas/agora-dollar-evm-dev). Follow these patterns for consistency with Agora's codebase.

## Project Structure

Use [solidity-template](https://github.com/amphora-atlas/solidity-template) as the base:

```
src/
├── contracts/           # Main contract files
│   ├── AgoraType.sol
│   ├── interfaces/      # Interface definitions
│   │   └── IAgoraType.sol
│   └── mocks/           # Mock contracts for testing
│       └── MockAUSD.sol
├── script/              # Deployment scripts
│   ├── BaseScript.sol
│   └── deploy/
│       └── deployAgoraType.s.sol
└── test/                # Test files
    ├── BaseTest.sol     # Shared test setup
    ├── Helpers.sol      # Test utilities
    └── agora-type/      # Feature-specific tests
        ├── TestDeposit.t.sol
        ├── TestWithdraw.t.sol
        ├── TestSubmitAttempt.t.sol
        └── TestSettle.t.sol
```

## Foundry Configuration

Key `foundry.toml` settings:

```toml
[profile.default]
src = 'src/contracts'
test = 'src/test'
script = "src/script"
evm_version = "cancun"
solc_version = "0.8.28"

[fmt]
single_line_statement_blocks = "single"
multiline_func_header = "params_first"
line_length = 120
tab_width = 4
bracket_spacing = true
int_types = "long"
number_underscore = "thousands"
sort_imports = true
```

## Contract Style

### File Header

Every contract file should have:

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.28;

// ====================================================================
//             _        ______     ___   _______          _
//            / \     .' ___  |  .'   `.|_   __ \        / \
//           / _ \   / .'   \_| /  .-.  \ | |__) |      / _ \
//          / ___ \  | |   ____ | |   | | |  __ /      / ___ \
//        _/ /   \ \_\ `.___]  |\  `-'  /_| |  \ \_  _/ /   \ \_
//       |____| |____|`._____.'  `.___.'|____| |___||____| |____|
// ====================================================================
// ============================ AgoraType =============================
// ====================================================================
```

### Imports

- Sort imports alphabetically
- Group by source (OpenZeppelin, local, etc.)
- Use named imports

```solidity
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { IAgoraType } from "./interfaces/IAgoraType.sol";
```

### Struct Definitions

Define structs outside the contract with natspec:

```solidity
/// @notice The Constructor Params for AgoraType
/// @param token The address of the entry token (AUSD)
/// @param operator The address of the operator
struct ConstructorParams {
    address token;
    address operator;
}
```

### NatSpec Documentation

Full natspec for all public/external functions:

```solidity
/// @notice The ```deposit``` function allows a player to deposit tokens for playing
/// @dev Requires prior token approval
/// @param _amount The amount of tokens to deposit
function deposit(uint256 _amount) external {
```

Use triple backticks around function names in natspec descriptions.

### Section Comments

Organize contract sections with visual separators:

```solidity
//==============================================================================
// Constructor & Initialization Functions
//==============================================================================

//==============================================================================
// Admin Functions
//==============================================================================

//==============================================================================
// Player Functions
//==============================================================================

//==============================================================================
// Operator Functions
//==============================================================================

//==============================================================================
// View Functions
//==============================================================================
```

### Variable Naming

- Use underscore prefix for function parameters: `_amount`, `_player`
- Use underscore prefix for internal/private variables
- Use descriptive names, no abbreviations

```solidity
function submitAttempt(address _player, uint256 _score) external;
```

### Error Definitions

Use custom errors with descriptive names:

```solidity
error InsufficientDeposit(address player, uint256 required, uint256 available);
error CompetitionNotActive();
error AlreadySettled();
error NotOperator();
```

### Event Definitions

Include all relevant data, use indexed for addresses:

```solidity
event Deposited(address indexed player, uint256 amount, uint256 newBalance);
event AttemptSubmitted(address indexed player, uint256 score, uint256 bestScore, uint256 pot);
event Settled(address indexed winner, uint256 prize);
```

### Versioning

Include version struct in contracts:

```solidity
/// @notice The ```Version``` struct represents the contract version
struct Version {
    uint256 major;
    uint256 minor;
    uint256 patch;
}

/// @notice The ```version``` function returns the contract version
/// @return _version The version struct
function version() public pure returns (Version memory _version) {
    _version = Version({ major: 1, minor: 0, patch: 0 });
}
```

## Interface Style

Interfaces should mirror the contract structure:

```solidity
// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.4;

interface IAgoraType {
    // Structs (as libraries for external visibility)
    struct Version {
        uint256 major;
        uint256 minor;
        uint256 patch;
    }

    // Errors
    error InsufficientDeposit(address player, uint256 required, uint256 available);
    error CompetitionNotActive();

    // Events
    event Deposited(address indexed player, uint256 amount, uint256 newBalance);
    event Settled(address indexed winner, uint256 prize);

    // Functions
    function deposit(uint256 _amount) external;
    function withdraw(uint256 _amount) external;
    function getState() external view returns (...);
}
```

## Test Style

### BaseTest Pattern

Create a shared `BaseTest.sol` with common setup:

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { Test, console2 as console } from "forge-std/Test.sol";
import { VmHelper } from "agora-std/VmHelper.sol";

import { AgoraType } from "contracts/AgoraType.sol";
import { MockAUSD } from "contracts/mocks/MockAUSD.sol";

contract BaseTest is Test, VmHelper {
    MockAUSD public token;
    AgoraType public agoraType;

    address public ownerAddress;
    address public operatorAddress;

    function _defaultSetup() internal {
        ownerAddress = labelAndDeal("ownerAddress");
        operatorAddress = labelAndDeal("operatorAddress");

        // Deploy mock token
        token = new MockAUSD();

        // Deploy AgoraType
        vm.prank(ownerAddress);
        agoraType = new AgoraType(address(token), operatorAddress);
    }
}
```

### Test File Structure

Each test file focuses on one feature:

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "../BaseTest.sol";

contract TestDeposit is BaseTest {
    address payable public alice = labelAndDeal("alice");
    address payable public bob = labelAndDeal("bob");

    function setUp() public {
        /// BACKGROUND: contracts deployed
        _defaultSetup();
    }

    function test_CanDeposit(uint256 _amount) public {
        vm.assume(_amount > 0 && _amount <= 1_000_000e18);

        // Setup
        token.mint(alice, _amount);
        vm.prank(alice);
        token.approve(address(agoraType), _amount);

        assertEq({
            err: "/// GIVEN: alice has tokens",
            left: _amount,
            right: token.balanceOf(alice)
        });

        // Action
        vm.prank(alice);
        agoraType.deposit(_amount);

        // Assertions
        assertEq({
            err: "/// THEN: alice's deposit is recorded",
            left: _amount,
            right: agoraType.deposits(alice)
        });
    }

    function test_RevertWhen_DepositZero() public {
        /// WHEN: alice tries to deposit 0
        vm.prank(alice);
        vm.expectRevert(AgoraType.ZeroAmount.selector);
        agoraType.deposit(0);
    }
}
```

### Test Naming Conventions

- `test_<Action>` - Success cases
- `test_RevertWhen_<Condition>` - Expected reverts
- `testFuzz_<Action>` - Fuzz tests

### Assertion Style

Use named assertions with Gherkin-style comments:

```solidity
assertEq({
    err: "/// GIVEN: alice has initial balance of 0",
    left: 0,
    right: agoraType.deposits(alice)
});

// ... action ...

assertEq({
    err: "/// THEN: alice's balance increased by _amount",
    left: _amount,
    right: agoraType.deposits(alice)
});
```

### Helper Functions

Create abstract helper contracts for common actions:

```solidity
abstract contract AgoraTypeDepositFunctions is BaseTest {
    function _deposit_as(address _player, uint256 _amount) internal {
        token.mint(_player, _amount);
        vm.startPrank(_player);
        token.approve(address(agoraType), _amount);
        agoraType.deposit(_amount);
        vm.stopPrank();
    }
}
```

## Dependencies

From `package.json`:

```json
{
  "dependencies": {
    "@openzeppelin/contracts": "^5.0.1",
    "@openzeppelin/contracts-upgradeable": "^5.0.2",
    "forge-std": "github:foundry-rs/forge-std",
    "ds-test": "github:dapphub/ds-test"
  },
  "devDependencies": {
    "prettier": "^3.3.2",
    "prettier-plugin-solidity": "^1.3.1",
    "solhint-community": "^3.7.0"
  }
}
```

## Formatting Commands

```bash
# Format Solidity
forge fmt src

# Format with Prettier (for consistency)
npm run format

# Lint
npm run lint

# Run tests
FOUNDRY_PROFILE=test forge test
```

## Additional Notes

1. **Use `hoax()` or `startHoax()`** for pranking with ETH balance
2. **Use `labelAndDeal()`** from VmHelper for test addresses
3. **Use `vm.assume()`** in fuzz tests to constrain inputs
4. **Avoid magic numbers** - use named constants
5. **Keep line length under 120 characters**
6. **Use `uint256` over `uint`** (explicit sizing)
