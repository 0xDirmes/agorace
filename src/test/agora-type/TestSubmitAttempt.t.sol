// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { IAgoraType } from "interfaces/IAgoraType.sol";

import "../BaseTest.sol";

contract TestSubmitAttempt is BaseTest {

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

    function test_CanSubmitAttempt() public {
        uint256 _score = 7650; // 76.50 WPM * accuracy

        // Setup
        _depositAs(alice, DEFAULT_DEPOSIT);

        assertEq({ err: "/// GIVEN: alice has a deposit", left: DEFAULT_DEPOSIT, right: agoraType.deposits(alice) });
        assertEq({ err: "/// GIVEN: pot is empty", left: 0, right: agoraType.pot() });

        // Action
        _submitAttemptAs(alice, _score);

        // Assertions (one-time fee: deposit goes to 0)
        assertEq({ err: "/// THEN: alice's deposit reduced by entry fee", left: 0, right: agoraType.deposits(alice) });
        assertEq({ err: "/// THEN: pot increased by entry fee", left: ENTRY_FEE, right: agoraType.pot() });
        assertEq({ err: "/// THEN: alice's best score is recorded", left: _score, right: agoraType.bestScore(alice) });
        assertTrue(agoraType.isPlayer(alice), "/// THEN: alice is marked as player");
    }

    function test_SubmitAttempt_UpdatesBestScore() public {
        uint256 _firstScore = 7000;
        uint256 _secondScore = 8000;
        uint256 _thirdScore = 7500;

        _depositAs(alice, DEFAULT_DEPOSIT);

        // First attempt
        _submitAttemptAs(alice, _firstScore);
        assertEq({
            err: "/// GIVEN: alice's best score is first score", left: _firstScore, right: agoraType.bestScore(alice)
        });

        // Second attempt (better)
        _submitAttemptAs(alice, _secondScore);
        assertEq({
            err: "/// THEN: alice's best score updated to second score",
            left: _secondScore,
            right: agoraType.bestScore(alice)
        });

        // Third attempt (worse)
        _submitAttemptAs(alice, _thirdScore);
        assertEq({
            err: "/// THEN: alice's best score unchanged", left: _secondScore, right: agoraType.bestScore(alice)
        });
    }

    function test_SubmitAttempt_TracksPlayerOnce() public {
        _depositAs(alice, DEFAULT_DEPOSIT);

        // First attempt - pays entry fee
        _submitAttemptAs(alice, 7000);
        assertEq({ err: "/// GIVEN: player count is 1", left: 1, right: agoraType.getPlayerCount() });
        assertEq({ err: "/// THEN: deposit is 0 after entry fee", left: 0, right: agoraType.deposits(alice) });

        // Second attempt - free (already paid)
        _submitAttemptAs(alice, 8000);
        assertEq({ err: "/// THEN: player count still 1", left: 1, right: agoraType.getPlayerCount() });
        assertEq({ err: "/// THEN: deposit still 0 (no additional fee)", left: 0, right: agoraType.deposits(alice) });
    }

    function test_SecondAttemptIsFree() public {
        _depositAs(alice, DEFAULT_DEPOSIT);

        // First attempt - pays entry fee
        _submitAttemptAs(alice, 7000);
        assertEq({ err: "/// GIVEN: deposit depleted after first attempt", left: 0, right: agoraType.deposits(alice) });
        assertEq({ err: "/// GIVEN: pot has entry fee", left: ENTRY_FEE, right: agoraType.pot() });

        // Second attempt - free
        _submitAttemptAs(alice, 7500);
        assertEq({ err: "/// THEN: deposit unchanged (no fee)", left: 0, right: agoraType.deposits(alice) });
        assertEq({ err: "/// THEN: pot unchanged (no additional fee)", left: ENTRY_FEE, right: agoraType.pot() });
        assertEq({ err: "/// THEN: best score updated", left: 7500, right: agoraType.bestScore(alice) });

        // Third attempt - still free
        _submitAttemptAs(alice, 8000);
        assertEq({ err: "/// THEN: deposit still 0", left: 0, right: agoraType.deposits(alice) });
        assertEq({ err: "/// THEN: pot still same (one-time fee)", left: ENTRY_FEE, right: agoraType.pot() });
        assertEq({ err: "/// THEN: best score updated again", left: 8000, right: agoraType.bestScore(alice) });
    }

    function test_SubmitAttempt_MultiplePlayers() public {
        _depositAs(alice, DEFAULT_DEPOSIT);
        _depositAs(bob, DEFAULT_DEPOSIT);

        _submitAttemptAs(alice, 7000);
        _submitAttemptAs(bob, 8000);

        assertEq({ err: "/// THEN: player count is 2", left: 2, right: agoraType.getPlayerCount() });
        assertEq({ err: "/// THEN: pot has 2 entry fees", left: 2 * ENTRY_FEE, right: agoraType.pot() });
    }

    function test_EmitsAttemptSubmittedEvent() public {
        uint256 _score = 7650;

        _depositAs(alice, DEFAULT_DEPOSIT);

        vm.expectEmit(true, false, false, true);
        emit IAgoraType.AttemptSubmitted(alice, _score, _score, ENTRY_FEE);

        _submitAttemptAs(alice, _score);
    }

    function test_OwnerCanAlsoSubmitAttempts() public {
        _depositAs(alice, DEFAULT_DEPOSIT);

        // Owner should also be able to submit attempts
        vm.prank(ownerAddress);
        agoraType.submitAttempt(alice, 7000);

        assertEq({ err: "/// THEN: attempt recorded", left: 7000, right: agoraType.bestScore(alice) });
    }

    //==============================================================================
    // Revert Cases
    //==============================================================================

    function test_RevertWhen_NotOperator() public {
        _depositAs(alice, DEFAULT_DEPOSIT);

        /// WHEN: non-operator tries to submit
        vm.prank(alice);
        vm.expectRevert(IAgoraType.NotOperator.selector);
        agoraType.submitAttempt(alice, 7000);
    }

    function test_RevertWhen_CompetitionNotStarted() public {
        // New setup without starting competition
        _defaultSetup();
        _depositAs(alice, DEFAULT_DEPOSIT);

        /// WHEN: trying to submit before competition
        vm.prank(operatorAddress);
        vm.expectRevert(IAgoraType.CompetitionNotActive.selector);
        agoraType.submitAttempt(alice, 7000);
    }

    function test_RevertWhen_CompetitionEnded() public {
        _depositAs(alice, DEFAULT_DEPOSIT);

        // Warp past competition end
        _warpToCompetitionEnd();

        /// WHEN: trying to submit after competition
        vm.prank(operatorAddress);
        vm.expectRevert(IAgoraType.CompetitionNotActive.selector);
        agoraType.submitAttempt(alice, 7000);
    }

    function test_RevertWhen_InsufficientDeposit() public {
        // Alice has no deposit
        assertEq({ err: "/// GIVEN: alice has no deposit", left: 0, right: agoraType.deposits(alice) });

        /// WHEN: operator tries to submit for alice
        vm.prank(operatorAddress);
        vm.expectRevert(abi.encodeWithSelector(IAgoraType.InsufficientDeposit.selector, alice, ENTRY_FEE, 0));
        agoraType.submitAttempt(alice, 7000);
    }

    function test_RevertWhen_DepositBelowEntryFee() public {
        uint256 _smallDeposit = ENTRY_FEE - 1;
        _depositAs(alice, _smallDeposit);

        /// WHEN: operator tries to submit for alice with insufficient deposit
        vm.prank(operatorAddress);
        vm.expectRevert(
            abi.encodeWithSelector(IAgoraType.InsufficientDeposit.selector, alice, ENTRY_FEE, _smallDeposit)
        );
        agoraType.submitAttempt(alice, 7000);
    }

}
