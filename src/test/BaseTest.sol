// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { VmHelper } from "agora-std/VmHelper.sol";
import { Test, console2 as console } from "forge-std/Test.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { AgoRace, ConstructorParams } from "contracts/AgoRace.sol";
import { IAgoraDollar } from "src/interfaces/IAgoraDollar.sol";

/// @title BaseTest
/// @notice Shared test setup for AgoRace tests (fork-based with real AUSD)
contract BaseTest is Test, VmHelper {

    //==============================================================================
    // Test Constants
    //==============================================================================

    uint256 public constant ATTEMPT_FEE = 1e6; // Match contract: 1 AUSD per attempt

    uint256 public constant DURATION = 7 days;

    /// @dev Real AUSD (AgoraDollar) on Arbitrum Sepolia
    address public constant AUSD_ADDRESS = 0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC;

    /// @dev Role holder with minter permissions on AUSD
    address public constant AUSD_ROLE_HOLDER = 0x99B0E95Fa8F5C3b86e4d78ED715B475cFCcf6E97;

    //==============================================================================
    // Contract Instances
    //==============================================================================

    IAgoraDollar public token;
    AgoRace public agoRace;

    //==============================================================================
    // Role Addresses
    //==============================================================================

    address payable public ownerAddress;
    address payable public operatorAddress;

    //==============================================================================
    // Player Accounts (address + private key for signing)
    //==============================================================================

    address public alice;
    uint256 public alicePk;
    address public bob;
    uint256 public bobPk;
    address public charlie;
    uint256 public charliePk;

    //==============================================================================
    // Setup Functions
    //==============================================================================

    /// @notice Default setup for AgoRace tests (forks Arbitrum Sepolia)
    function _defaultSetup() internal {
        // Fork Arbitrum Sepolia to use real AUSD (uses [rpc_endpoints] from foundry.toml)
        vm.createSelectFork("arbitrum_sepolia");

        // Set role addresses
        ownerAddress = labelAndDeal("ownerAddress");
        operatorAddress = labelAndDeal("operatorAddress");

        // Create player accounts with known private keys (needed for vm.sign)
        (alice, alicePk) = makeAddrAndKey("alice");
        (bob, bobPk) = makeAddrAndKey("bob");
        (charlie, charliePk) = makeAddrAndKey("charlie");

        // Reference real AUSD
        token = IAgoraDollar(AUSD_ADDRESS);

        // Deploy AgoRace implementation
        AgoRace impl = new AgoRace();

        // Encode initialize call
        bytes memory initData = abi.encodeWithSelector(
            AgoRace.initialize.selector,
            ConstructorParams({ initialOwner: ownerAddress, token: AUSD_ADDRESS, operator: operatorAddress })
        );

        // Deploy proxy and cast to AgoRace
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        agoRace = AgoRace(address(proxy));
    }

    //==============================================================================
    // Helper Functions
    //==============================================================================

    /// @notice Mints AUSD to a player via the real role holder
    /// @param _to The address to mint tokens to
    /// @param _amount The amount of tokens to mint
    function _mintAUSD(address _to, uint256 _amount) internal {
        vm.prank(AUSD_ROLE_HOLDER);
        token.mint(_to, _amount);
    }

    /// @notice Convenience helper: mints tokens, approves, and submits an attempt
    /// @param _player The player's address
    /// @param _playerPk The player's private key (unused — kept for callsite compatibility)
    /// @param _score The score to submit
    function _submitAttempt(address _player, uint256 _playerPk, uint256 _score) internal {
        _mintAUSD(_player, ATTEMPT_FEE);
        vm.prank(_player);
        IERC20(address(token)).approve(address(agoRace), ATTEMPT_FEE);
        vm.prank(operatorAddress);
        agoRace.submitAttempt(_player, _score);
    }

    /// @notice Starts a competition as the owner
    function _startCompetition() internal {
        vm.prank(ownerAddress);
        agoRace.startCompetition();
    }

    /// @notice Warps time to after competition end
    function _warpToCompetitionEnd() internal {
        (, uint256 _endTime,,,,) = agoRace.getState();
        vm.warp(_endTime + 1);
    }

    /// @notice Settles the competition as the owner
    function _settle() internal {
        vm.prank(ownerAddress);
        agoRace.settle();
    }

}
