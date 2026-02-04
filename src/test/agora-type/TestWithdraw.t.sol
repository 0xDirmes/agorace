// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { IAgoraType } from "interfaces/IAgoraType.sol";

import "../BaseTest.sol";

contract TestWithdraw is BaseTest {

    address payable public alice;

    function setUp() public {
        /// BACKGROUND: contracts deployed
        _defaultSetup();

        alice = labelAndDeal("alice");
    }

    //==============================================================================
    // Success Cases
    //==============================================================================

    function test_CanWithdraw() public {
        uint256 _depositAmount = 10e6;
        uint256 _withdrawAmount = 5e6;

        // Setup
        _depositAs(alice, _depositAmount);

        assertEq({ err: "/// GIVEN: alice has a deposit", left: _depositAmount, right: agoraType.deposits(alice) });

        // Action
        vm.prank(alice);
        agoraType.withdraw(_withdrawAmount);

        // Assertions
        assertEq({
            err: "/// THEN: alice's deposit is reduced",
            left: _depositAmount - _withdrawAmount,
            right: agoraType.deposits(alice)
        });
        assertEq({ err: "/// THEN: alice receives tokens", left: _withdrawAmount, right: token.balanceOf(alice) });
    }

    function test_CanWithdrawAll() public {
        uint256 _amount = 10e6;

        // Setup
        _depositAs(alice, _amount);

        // Action
        vm.prank(alice);
        agoraType.withdraw(_amount);

        // Assertions
        assertEq({ err: "/// THEN: alice's deposit is 0", left: 0, right: agoraType.deposits(alice) });
        assertEq({ err: "/// THEN: alice receives all tokens", left: _amount, right: token.balanceOf(alice) });
    }

    function testFuzz_CanWithdrawPartial(
        uint256 _depositAmount,
        uint256 _withdrawAmount
    ) public {
        vm.assume(_depositAmount > 0 && _depositAmount <= 1_000_000e6);
        vm.assume(_withdrawAmount > 0 && _withdrawAmount <= _depositAmount);

        // Setup
        _depositAs(alice, _depositAmount);

        // Action
        vm.prank(alice);
        agoraType.withdraw(_withdrawAmount);

        // Assertions
        assertEq({
            err: "/// THEN: deposit reduced correctly",
            left: _depositAmount - _withdrawAmount,
            right: agoraType.deposits(alice)
        });
    }

    function test_EmitsWithdrawnEvent() public {
        uint256 _depositAmount = 10e6;
        uint256 _withdrawAmount = 3e6;

        _depositAs(alice, _depositAmount);

        vm.expectEmit(true, false, false, true);
        emit IAgoraType.Withdrawn(alice, _withdrawAmount, _depositAmount - _withdrawAmount);

        vm.prank(alice);
        agoraType.withdraw(_withdrawAmount);
    }

    //==============================================================================
    // Revert Cases
    //==============================================================================

    function test_RevertWhen_WithdrawZero() public {
        _depositAs(alice, 10e6);

        /// WHEN: alice tries to withdraw 0
        vm.prank(alice);
        vm.expectRevert(IAgoraType.ZeroAmount.selector);
        agoraType.withdraw(0);
    }

    function test_RevertWhen_InsufficientDeposit() public {
        uint256 _depositAmount = 5e6;
        uint256 _withdrawAmount = 10e6;

        _depositAs(alice, _depositAmount);

        /// WHEN: alice tries to withdraw more than deposited
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(IAgoraType.InsufficientDeposit.selector, alice, _withdrawAmount, _depositAmount)
        );
        agoraType.withdraw(_withdrawAmount);
    }

    function test_RevertWhen_NoDeposit() public {
        /// GIVEN: alice has no deposit
        assertEq({ err: "alice has no deposit", left: 0, right: agoraType.deposits(alice) });

        /// WHEN: alice tries to withdraw
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(IAgoraType.InsufficientDeposit.selector, alice, 1e6, 0));
        agoraType.withdraw(1e6);
    }

}
