// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { IAgoRace } from "interfaces/IAgoRace.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../BaseTest.sol";

contract TestSettle is BaseTest {

    function setUp() public {
        /// BACKGROUND: contracts deployed (forked) and competition started
        _defaultSetup();
        _startCompetition();
    }

    //==============================================================================
    // Success Cases
    //==============================================================================

    function test_CanSettle() public {
        // Setup: alice and bob play, bob wins
        _submitAttempt(alice, alicePk, 7000);
        _submitAttempt(bob, bobPk, 8000); // Bob has higher score

        uint256 _expectedPrize = 2 * ATTEMPT_FEE;

        // Warp to competition end
        _warpToCompetitionEnd();

        // Action
        _settle();

        // Assertions
        assertTrue(agoRace.settled(), "/// THEN: competition is marked settled");
        assertEq({ err: "/// THEN: pot is emptied", left: 0, right: agoRace.pot() });
        assertEq({
            err: "/// THEN: bob receives prize",
            left: _expectedPrize,
            right: IERC20(address(token)).balanceOf(bob)
        });
        assertEq({
            err: "/// THEN: alice receives nothing", left: 0, right: IERC20(address(token)).balanceOf(alice)
        });
    }

    function test_SettleWithSinglePlayer() public {
        // Setup: only alice plays
        _submitAttempt(alice, alicePk, 7000);

        uint256 _expectedPrize = ATTEMPT_FEE;

        // Warp to competition end
        _warpToCompetitionEnd();

        // Action
        _settle();

        // Assertions
        assertEq({
            err: "/// THEN: alice receives her attempt fee back",
            left: _expectedPrize,
            right: IERC20(address(token)).balanceOf(alice)
        });
    }

    function test_SettleWithTiedScores() public {
        // Setup: alice and bob tie, first player (alice) wins
        _submitAttempt(alice, alicePk, 7500);
        _submitAttempt(bob, bobPk, 7500);

        uint256 _expectedPrize = 2 * ATTEMPT_FEE;

        _warpToCompetitionEnd();
        _settle();

        // Alice wins ties because she played first (first in players array with max score)
        assertEq({
            err: "/// THEN: alice wins the tie",
            left: _expectedPrize,
            right: IERC20(address(token)).balanceOf(alice)
        });
    }

    function test_SettleWithManyPlayers() public {
        // Setup: multiple players, charlie wins
        _submitAttempt(alice, alicePk, 7000);
        _submitAttempt(bob, bobPk, 8000);
        _submitAttempt(charlie, charliePk, 9000); // Charlie wins

        uint256 _expectedPrize = 3 * ATTEMPT_FEE;

        _warpToCompetitionEnd();
        _settle();

        assertEq({
            err: "/// THEN: charlie receives prize",
            left: _expectedPrize,
            right: IERC20(address(token)).balanceOf(charlie)
        });
    }

    function test_EmitsSettledEvent() public {
        _submitAttempt(alice, alicePk, 7000);

        uint256 _expectedPrize = ATTEMPT_FEE;

        _warpToCompetitionEnd();

        vm.expectEmit(true, false, false, true);
        emit IAgoRace.Settled(alice, _expectedPrize);

        _settle();
    }

    //==============================================================================
    // Revert Cases
    //==============================================================================

    function test_RevertWhen_CompetitionNotEnded() public {
        _submitAttempt(alice, alicePk, 7000);

        /// WHEN: trying to settle before competition ends
        vm.prank(ownerAddress);
        vm.expectRevert(IAgoRace.CompetitionNotEnded.selector);
        agoRace.settle();
    }

    function test_RevertWhen_AlreadySettled() public {
        _submitAttempt(alice, alicePk, 7000);

        _warpToCompetitionEnd();
        _settle();

        /// WHEN: trying to settle again
        vm.prank(ownerAddress);
        vm.expectRevert(IAgoRace.AlreadySettled.selector);
        agoRace.settle();
    }

    function test_RevertWhen_NoPlayers() public {
        // No one plays
        _warpToCompetitionEnd();

        /// WHEN: trying to settle with no players
        vm.prank(ownerAddress);
        vm.expectRevert(IAgoRace.NoPlayers.selector);
        agoRace.settle();
    }

    function test_RevertWhen_NotOwner() public {
        _submitAttempt(alice, alicePk, 7000);

        _warpToCompetitionEnd();

        /// WHEN: non-owner tries to settle
        vm.prank(alice);
        vm.expectRevert();
        agoRace.settle();
    }

}
