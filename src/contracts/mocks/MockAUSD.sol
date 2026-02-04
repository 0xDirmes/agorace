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
// ============================= MockAUSD =============================
// ====================================================================

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockAUSD
/// @notice Mock AUSD token for testnet deployment
/// @dev Anyone can mint tokens for testing purposes
contract MockAUSD is ERC20 {

    //==============================================================================
    // Constructor
    //==============================================================================

    constructor() ERC20("Mock Agora USD", "AUSD") { }

    //==============================================================================
    // Public Functions
    //==============================================================================

    /// @notice The ```mint``` function mints tokens to the specified address
    /// @dev No access control - anyone can mint for testing
    /// @param _to The address to mint tokens to
    /// @param _amount The amount of tokens to mint
    function mint(
        address _to,
        uint256 _amount
    ) external {
        _mint(_to, _amount);
    }

    /// @notice The ```burn``` function burns tokens from the caller's balance
    /// @param _amount The amount of tokens to burn
    function burn(
        uint256 _amount
    ) external {
        _burn(msg.sender, _amount);
    }

    /// @notice Returns 6 decimals to match real AUSD
    /// @return The number of decimals (6)
    function decimals() public pure override returns (uint8) {
        return 6;
    }

}
