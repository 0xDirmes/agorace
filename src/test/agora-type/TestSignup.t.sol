// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { IAgoraType } from "interfaces/IAgoraType.sol";

import "../BaseTest.sol";

contract TestSignup is BaseTest {

    address payable public alice;
    address payable public bob;

    function setUp() public {
        /// BACKGROUND: contracts deployed and competition started
        _defaultSetup();
        _startCompetition();

        alice = labelAndDeal("alice");
        bob = labelAndDeal("bob");
    }

    //==============================================================================
    // Success Cases
    //==============================================================================

    function test_CanSignup() public {
        // Setup
        token.mint(alice, ENTRY_FEE);
        vm.prank(alice);
        token.approve(address(agoraType), ENTRY_FEE);

        assertEq({ err: "/// GIVEN: alice has tokens", left: ENTRY_FEE, right: token.balanceOf(alice) });
        assertEq({ err: "/// GIVEN: pot is empty", left: 0, right: agoraType.pot() });

        // Action
        vm.prank(alice);
        agoraType.signup();

        // Assertions
        assertTrue(agoraType.isPlayer(alice), "/// THEN: alice is marked as player");
        assertEq({ err: "/// THEN: alice's token balance is 0", left: 0, right: token.balanceOf(alice) });
        assertEq({ err: "/// THEN: pot has entry fee", left: ENTRY_FEE, right: agoraType.pot() });
        assertEq({
            err: "/// THEN: contract holds the tokens", left: ENTRY_FEE, right: token.balanceOf(address(agoraType))
        });
    }

    function test_MultiplePlayers_CanSignup() public {
        _signupAs(alice);
        _signupAs(bob);

        assertTrue(agoraType.isPlayer(alice), "/// THEN: alice is a player");
        assertTrue(agoraType.isPlayer(bob), "/// THEN: bob is a player");
        assertEq({ err: "/// THEN: pot has two entry fees", left: 2 * ENTRY_FEE, right: agoraType.pot() });
        assertEq({ err: "/// THEN: player count is 2", left: 2, right: agoraType.getPlayerCount() });
    }

    function test_EmitsSignedUpEvent() public {
        token.mint(alice, ENTRY_FEE);
        vm.prank(alice);
        token.approve(address(agoraType), ENTRY_FEE);

        vm.expectEmit(true, false, false, true);
        emit IAgoraType.SignedUp(alice, ENTRY_FEE);

        vm.prank(alice);
        agoraType.signup();
    }

    //==============================================================================
    // Revert Cases
    //==============================================================================

    function test_RevertWhen_AlreadySignedUp() public {
        _signupAs(alice);

        // Try to sign up again
        token.mint(alice, ENTRY_FEE);
        vm.prank(alice);
        token.approve(address(agoraType), ENTRY_FEE);

        /// WHEN: alice tries to sign up again
        vm.prank(alice);
        vm.expectRevert(IAgoraType.AlreadySignedUp.selector);
        agoraType.signup();
    }

    function test_RevertWhen_CompetitionNotActive() public {
        // New setup without starting competition
        _defaultSetup();

        token.mint(alice, ENTRY_FEE);
        vm.prank(alice);
        token.approve(address(agoraType), ENTRY_FEE);

        /// WHEN: alice tries to sign up before competition
        vm.prank(alice);
        vm.expectRevert(IAgoraType.CompetitionNotActive.selector);
        agoraType.signup();
    }

    function test_RevertWhen_CompetitionEnded() public {
        _warpToCompetitionEnd();

        token.mint(alice, ENTRY_FEE);
        vm.prank(alice);
        token.approve(address(agoraType), ENTRY_FEE);

        /// WHEN: alice tries to sign up after competition ended
        vm.prank(alice);
        vm.expectRevert(IAgoraType.CompetitionNotActive.selector);
        agoraType.signup();
    }

    function test_RevertWhen_NoApproval() public {
        token.mint(alice, ENTRY_FEE);

        /// WHEN: alice tries to sign up without approval
        vm.prank(alice);
        vm.expectRevert();
        agoraType.signup();
    }

    function test_RevertWhen_InsufficientBalance() public {
        // Approve but don't have tokens
        vm.prank(alice);
        token.approve(address(agoraType), ENTRY_FEE);

        assertEq({ err: "/// GIVEN: alice has no tokens", left: 0, right: token.balanceOf(alice) });

        /// WHEN: alice tries to sign up without balance
        vm.prank(alice);
        vm.expectRevert();
        agoraType.signup();
    }

}
