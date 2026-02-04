// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { IAgoraType } from "interfaces/IAgoraType.sol";

import "../BaseTest.sol";

contract TestDeposit is BaseTest {

    address payable public alice;
    address payable public bob;

    function setUp() public {
        /// BACKGROUND: contracts deployed
        _defaultSetup();

        alice = labelAndDeal("alice");
        bob = labelAndDeal("bob");
    }

    //==============================================================================
    // Success Cases
    //==============================================================================

    function test_CanDeposit() public {
        uint256 _amount = 10e6;

        // Setup
        token.mint(alice, _amount);
        vm.prank(alice);
        token.approve(address(agoraType), _amount);

        assertEq({ err: "/// GIVEN: alice has tokens", left: _amount, right: token.balanceOf(alice) });
        assertEq({ err: "/// GIVEN: alice has no deposit", left: 0, right: agoraType.deposits(alice) });

        // Action
        vm.prank(alice);
        agoraType.deposit(_amount);

        // Assertions
        assertEq({ err: "/// THEN: alice's deposit is recorded", left: _amount, right: agoraType.deposits(alice) });
        assertEq({ err: "/// THEN: alice's token balance is 0", left: 0, right: token.balanceOf(alice) });
        assertEq({
            err: "/// THEN: contract holds the tokens", left: _amount, right: token.balanceOf(address(agoraType))
        });
    }

    function testFuzz_CanDepositAnyAmount(
        uint256 _amount
    ) public {
        vm.assume(_amount > 0 && _amount <= 1_000_000e6);

        // Setup
        token.mint(alice, _amount);
        vm.prank(alice);
        token.approve(address(agoraType), _amount);

        // Action
        vm.prank(alice);
        agoraType.deposit(_amount);

        // Assertions
        assertEq({ err: "/// THEN: alice's deposit equals _amount", left: _amount, right: agoraType.deposits(alice) });
    }

    function test_CanDepositMultipleTimes() public {
        uint256 _firstDeposit = 5e6;
        uint256 _secondDeposit = 3e6;

        // First deposit
        _depositAs(alice, _firstDeposit);
        assertEq({ err: "/// GIVEN: alice has first deposit", left: _firstDeposit, right: agoraType.deposits(alice) });

        // Second deposit
        _depositAs(alice, _secondDeposit);
        assertEq({
            err: "/// THEN: alice's deposit is cumulative",
            left: _firstDeposit + _secondDeposit,
            right: agoraType.deposits(alice)
        });
    }

    function test_EmitsDepositedEvent() public {
        uint256 _amount = 10e6;

        token.mint(alice, _amount);
        vm.prank(alice);
        token.approve(address(agoraType), _amount);

        vm.expectEmit(true, false, false, true);
        emit IAgoraType.Deposited(alice, _amount, _amount);

        vm.prank(alice);
        agoraType.deposit(_amount);
    }

    //==============================================================================
    // Revert Cases
    //==============================================================================

    function test_RevertWhen_DepositZero() public {
        /// WHEN: alice tries to deposit 0
        vm.prank(alice);
        vm.expectRevert(IAgoraType.ZeroAmount.selector);
        agoraType.deposit(0);
    }

    function test_RevertWhen_NoApproval() public {
        uint256 _amount = 10e6;
        token.mint(alice, _amount);

        /// WHEN: alice tries to deposit without approval
        vm.prank(alice);
        vm.expectRevert();
        agoraType.deposit(_amount);
    }

    function test_RevertWhen_InsufficientBalance() public {
        uint256 _amount = 10e6;

        // Approve but don't have tokens
        vm.prank(alice);
        token.approve(address(agoraType), _amount);

        assertEq({ err: "/// GIVEN: alice has no tokens", left: 0, right: token.balanceOf(alice) });

        /// WHEN: alice tries to deposit without balance
        vm.prank(alice);
        vm.expectRevert();
        agoraType.deposit(_amount);
    }

}
