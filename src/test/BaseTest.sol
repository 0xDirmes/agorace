// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { VmHelper } from "agora-std/VmHelper.sol";
import { Test, console2 as console } from "forge-std/Test.sol";

import { AgoraType, ConstructorParams } from "contracts/AgoraType.sol";
import { MockAUSD } from "contracts/mocks/MockAUSD.sol";

/// @title BaseTest
/// @notice Shared test setup for AgoraType tests
contract BaseTest is Test, VmHelper {

    //==============================================================================
    // Test Constants
    //==============================================================================

    uint256 public constant ENTRY_FEE = 10e6; // Match contract: one-time entry fee
    uint256 public constant DURATION = 7 days;
    uint256 public constant DEFAULT_DEPOSIT = 10e6; // Exactly one entry

    //==============================================================================
    // Contract Instances
    //==============================================================================

    MockAUSD public token;
    AgoraType public agoraType;

    //==============================================================================
    // Role Addresses
    //==============================================================================

    address payable public ownerAddress;
    address payable public operatorAddress;

    //==============================================================================
    // Setup Functions
    //==============================================================================

    /// @notice Default setup for AgoraType tests
    function _defaultSetup() internal {
        // Set role addresses
        ownerAddress = labelAndDeal("ownerAddress");
        operatorAddress = labelAndDeal("operatorAddress");

        // Deploy mock token
        token = new MockAUSD();

        // Deploy AgoraType
        vm.prank(ownerAddress);
        agoraType = new AgoraType(ConstructorParams({ token: address(token), operator: operatorAddress }));
    }

    //==============================================================================
    // Helper Functions
    //==============================================================================

    /// @notice Mints and deposits tokens for a player
    /// @param _player The player address
    /// @param _amount The amount to deposit
    function _depositAs(
        address _player,
        uint256 _amount
    ) internal {
        token.mint(_player, _amount);
        vm.startPrank(_player);
        token.approve(address(agoraType), _amount);
        agoraType.deposit(_amount);
        vm.stopPrank();
    }

    /// @notice Starts a competition as the owner
    function _startCompetition() internal {
        vm.prank(ownerAddress);
        agoraType.startCompetition();
    }

    /// @notice Submits an attempt as the operator
    /// @param _player The player address
    /// @param _score The score to submit
    function _submitAttemptAs(
        address _player,
        uint256 _score
    ) internal {
        vm.prank(operatorAddress);
        agoraType.submitAttempt(_player, _score);
    }

    /// @notice Warps time to after competition end
    function _warpToCompetitionEnd() internal {
        (, uint256 _endTime,,,,) = agoraType.getState();
        vm.warp(_endTime + 1);
    }

    /// @notice Settles the competition as the owner
    function _settle() internal {
        vm.prank(ownerAddress);
        agoraType.settle();
    }

}
