// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { IAgoraType } from "interfaces/IAgoraType.sol";

import "../BaseTest.sol";

contract TestSettle is BaseTest {

    address payable public alice;
    address payable public bob;
    address payable public charlie;

    function setUp() public {
        /// BACKGROUND: contracts deployed and competition started
        _defaultSetup();
        _startCompetition();

        alice = labelAndDeal("alice");
        bob = labelAndDeal("bob");
        charlie = labelAndDeal("charlie");
    }

    //==============================================================================
    // Success Cases
    //==============================================================================

    function test_CanSettle() public {
        // Setup: alice and bob play, bob wins
        _signupAs(alice);
        _signupAs(bob);

        _submitAttemptAs(alice, 7000);
        _submitAttemptAs(bob, 8000); // Bob has higher score

        uint256 _expectedPrize = 2 * ENTRY_FEE;

        // Warp to competition end
        _warpToCompetitionEnd();

        // Action
        _settle();

        // Assertions
        assertTrue(agoraType.settled(), "/// THEN: competition is marked settled");
        assertEq({ err: "/// THEN: pot is emptied", left: 0, right: agoraType.pot() });
        assertEq({ err: "/// THEN: bob receives prize", left: _expectedPrize, right: token.balanceOf(bob) });
        assertEq({ err: "/// THEN: alice receives nothing", left: 0, right: token.balanceOf(alice) });
    }

    function test_SettleWithSinglePlayer() public {
        // Setup: only alice plays
        _signupAs(alice);
        _submitAttemptAs(alice, 7000);

        uint256 _expectedPrize = ENTRY_FEE;

        // Warp to competition end
        _warpToCompetitionEnd();

        // Action
        _settle();

        // Assertions
        assertEq({
            err: "/// THEN: alice receives her entry fee back", left: _expectedPrize, right: token.balanceOf(alice)
        });
    }

    function test_SettleWithTiedScores() public {
        // Setup: alice and bob tie, first player (alice) wins
        _signupAs(alice);
        _signupAs(bob);

        _submitAttemptAs(alice, 7500);
        _submitAttemptAs(bob, 7500);

        uint256 _expectedPrize = 2 * ENTRY_FEE;

        _warpToCompetitionEnd();
        _settle();

        // Alice wins ties because she played first (first in players array with max score)
        assertEq({ err: "/// THEN: alice wins the tie", left: _expectedPrize, right: token.balanceOf(alice) });
    }

    function test_SettleWithManyPlayers() public {
        // Setup: multiple players, charlie wins
        _signupAs(alice);
        _signupAs(bob);
        _signupAs(charlie);

        _submitAttemptAs(alice, 7000);
        _submitAttemptAs(bob, 8000);
        _submitAttemptAs(charlie, 9000); // Charlie wins

        uint256 _expectedPrize = 3 * ENTRY_FEE;

        _warpToCompetitionEnd();
        _settle();

        assertEq({ err: "/// THEN: charlie receives prize", left: _expectedPrize, right: token.balanceOf(charlie) });
    }

    function test_EmitsSettledEvent() public {
        _signupAs(alice);
        _submitAttemptAs(alice, 7000);

        uint256 _expectedPrize = ENTRY_FEE;

        _warpToCompetitionEnd();

        vm.expectEmit(true, false, false, true);
        emit IAgoraType.Settled(alice, _expectedPrize);

        _settle();
    }

    //==============================================================================
    // Revert Cases
    //==============================================================================

    function test_RevertWhen_CompetitionNotEnded() public {
        _signupAs(alice);
        _submitAttemptAs(alice, 7000);

        /// WHEN: trying to settle before competition ends
        vm.prank(ownerAddress);
        vm.expectRevert(IAgoraType.CompetitionNotEnded.selector);
        agoraType.settle();
    }

    function test_RevertWhen_AlreadySettled() public {
        _signupAs(alice);
        _submitAttemptAs(alice, 7000);

        _warpToCompetitionEnd();
        _settle();

        /// WHEN: trying to settle again
        vm.prank(ownerAddress);
        vm.expectRevert(IAgoraType.AlreadySettled.selector);
        agoraType.settle();
    }

    function test_RevertWhen_NoPlayers() public {
        // No one plays
        _warpToCompetitionEnd();

        /// WHEN: trying to settle with no players
        vm.prank(ownerAddress);
        vm.expectRevert(IAgoraType.NoPlayers.selector);
        agoraType.settle();
    }

    function test_RevertWhen_NotOwner() public {
        _signupAs(alice);
        _submitAttemptAs(alice, 7000);

        _warpToCompetitionEnd();

        /// WHEN: non-owner tries to settle
        vm.prank(alice);
        vm.expectRevert();
        agoraType.settle();
    }

}
