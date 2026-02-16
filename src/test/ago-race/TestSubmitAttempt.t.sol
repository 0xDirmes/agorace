// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IAgoRace } from "interfaces/IAgoRace.sol";

import "../BaseTest.sol";

contract TestSubmitAttempt is BaseTest {

    function setUp() public {
        /// BACKGROUND: contracts deployed (forked) and competition started
        _defaultSetup();
        _startCompetition();
    }

    //==============================================================================
    // Success Cases
    //==============================================================================

    function test_CanSubmitAttempt() public {
        uint256 _score = 7650; // 76.50 WPM * accuracy

        // Action
        _submitAttempt(alice, alicePk, _score);

        // Assertions
        (uint256 _bestScore, bool _hasPlayed) = agoRace.getPlayerState(alice);
        assertEq({ err: "/// THEN: alice's best score is recorded", left: _score, right: _bestScore });
        assertTrue(_hasPlayed, "/// THEN: alice is marked as player");
        assertEq({ err: "/// THEN: pot has attempt fee", left: ATTEMPT_FEE, right: agoRace.pot() });
    }

    function test_FirstAttempt_AutoRegistersPlayer() public {
        // GIVEN: alice has not played
        (, bool _hasPlayedBefore) = agoRace.getPlayerState(alice);
        assertFalse(_hasPlayedBefore, "/// GIVEN: alice has not played");
        assertEq({ err: "/// GIVEN: player count is 0", left: 0, right: agoRace.getPlayerCount() });

        // Action
        _submitAttempt(alice, alicePk, 7000);

        // Assertions
        (, bool _hasPlayed) = agoRace.getPlayerState(alice);
        assertTrue(_hasPlayed, "/// THEN: alice is auto-registered");
        assertEq({ err: "/// THEN: player count is 1", left: 1, right: agoRace.getPlayerCount() });
        assertEq({ err: "/// THEN: first player is alice", left: alice, right: agoRace.players(0) });
    }

    function test_SubmitAttempt_UpdatesBestScore() public {
        uint256 _firstScore = 7000;
        uint256 _secondScore = 8000;
        uint256 _thirdScore = 7500;

        // First attempt
        _submitAttempt(alice, alicePk, _firstScore);
        (uint256 _bestScore,) = agoRace.getPlayerState(alice);
        assertEq({ err: "/// GIVEN: alice's best score is first score", left: _firstScore, right: _bestScore });

        // Second attempt (better)
        _submitAttempt(alice, alicePk, _secondScore);
        (_bestScore,) = agoRace.getPlayerState(alice);
        assertEq({ err: "/// THEN: alice's best score updated to second score", left: _secondScore, right: _bestScore });

        // Third attempt (worse)
        _submitAttempt(alice, alicePk, _thirdScore);
        (_bestScore,) = agoRace.getPlayerState(alice);
        assertEq({ err: "/// THEN: alice's best score unchanged", left: _secondScore, right: _bestScore });
    }

    function test_SubmitAttempt_TracksPlayerOnce() public {
        // First attempt — registers
        _submitAttempt(alice, alicePk, 7000);
        assertEq({ err: "/// GIVEN: player count is 1", left: 1, right: agoRace.getPlayerCount() });

        // Second attempt — still same player count
        _submitAttempt(alice, alicePk, 8000);
        assertEq({ err: "/// THEN: player count still 1", left: 1, right: agoRace.getPlayerCount() });
    }

    function test_EachAttemptChargesFee() public {
        // First attempt
        _submitAttempt(alice, alicePk, 7000);
        assertEq({ err: "/// GIVEN: pot has 1 attempt fee", left: ATTEMPT_FEE, right: agoRace.pot() });

        // Second attempt — pot grows
        _submitAttempt(alice, alicePk, 7500);
        assertEq({ err: "/// THEN: pot has 2 attempt fees", left: 2 * ATTEMPT_FEE, right: agoRace.pot() });

        // Third attempt — pot grows again
        _submitAttempt(alice, alicePk, 8000);
        assertEq({ err: "/// THEN: pot has 3 attempt fees", left: 3 * ATTEMPT_FEE, right: agoRace.pot() });
    }

    function test_SubmitAttempt_MultiplePlayers() public {
        _submitAttempt(alice, alicePk, 7000);
        _submitAttempt(bob, bobPk, 8000);

        assertEq({ err: "/// THEN: player count is 2", left: 2, right: agoRace.getPlayerCount() });
        assertEq({ err: "/// THEN: pot has 2 attempt fees", left: 2 * ATTEMPT_FEE, right: agoRace.pot() });
    }

    function test_EmitsAttemptSubmittedEvent() public {
        uint256 _score = 7650;

        _mintAUSD(alice, ATTEMPT_FEE);
        vm.prank(alice);
        IERC20(address(token)).approve(address(agoRace), ATTEMPT_FEE);

        vm.expectEmit(true, false, false, true);
        emit IAgoRace.AttemptSubmitted(alice, _score, _score, ATTEMPT_FEE);

        vm.prank(operatorAddress);
        agoRace.submitAttempt(alice, _score);
    }

    function test_OwnerCanAlsoSubmitAttempts() public {
        _mintAUSD(alice, ATTEMPT_FEE);
        vm.prank(alice);
        IERC20(address(token)).approve(address(agoRace), ATTEMPT_FEE);

        // Owner should also be able to submit attempts
        vm.prank(ownerAddress);
        agoRace.submitAttempt(alice, 7000);

        (uint256 _bestScore,) = agoRace.getPlayerState(alice);
        assertEq({ err: "/// THEN: attempt recorded", left: 7000, right: _bestScore });
    }

    function test_GetLeaderboard_ReturnsAddressesAndScores() public {
        _submitAttempt(alice, alicePk, 7000);
        _submitAttempt(bob, bobPk, 8000);

        (address[] memory _players, uint256[] memory _scores) = agoRace.getLeaderboard();

        assertEq({ err: "/// THEN: player count is 2", left: 2, right: _players.length });
        assertEq({ err: "/// THEN: first player is alice", left: alice, right: _players[0] });
        assertEq({ err: "/// THEN: second player is bob", left: bob, right: _players[1] });
        assertEq({ err: "/// THEN: alice score", left: 7000, right: _scores[0] });
        assertEq({ err: "/// THEN: bob score", left: 8000, right: _scores[1] });
    }

    //==============================================================================
    // Revert Cases
    //==============================================================================

    function test_RevertWhen_NotOperator() public {
        _mintAUSD(alice, ATTEMPT_FEE);
        vm.prank(alice);
        IERC20(address(token)).approve(address(agoRace), ATTEMPT_FEE);

        /// WHEN: non-operator tries to submit
        vm.prank(alice);
        vm.expectRevert(IAgoRace.NotOperator.selector);
        agoRace.submitAttempt(alice, 7000);
    }

    function test_RevertWhen_CompetitionNotStarted() public {
        // New setup without starting competition
        _defaultSetup();

        _mintAUSD(alice, ATTEMPT_FEE);
        vm.prank(alice);
        IERC20(address(token)).approve(address(agoRace), ATTEMPT_FEE);

        /// WHEN: trying to submit before competition
        vm.prank(operatorAddress);
        vm.expectRevert(IAgoRace.CompetitionNotActive.selector);
        agoRace.submitAttempt(alice, 7000);
    }

    function test_RevertWhen_CompetitionEnded() public {
        // Warp past competition end
        _warpToCompetitionEnd();

        _mintAUSD(alice, ATTEMPT_FEE);
        vm.prank(alice);
        IERC20(address(token)).approve(address(agoRace), ATTEMPT_FEE);

        /// WHEN: trying to submit after competition
        vm.prank(operatorAddress);
        vm.expectRevert(IAgoRace.CompetitionNotActive.selector);
        agoRace.submitAttempt(alice, 7000);
    }

    function test_RevertWhen_InsufficientBalance() public {
        // Approve but don't mint — alice has 0 AUSD
        vm.prank(alice);
        IERC20(address(token)).approve(address(agoRace), ATTEMPT_FEE);

        /// WHEN: trying to submit without balance
        vm.prank(operatorAddress);
        vm.expectRevert();
        agoRace.submitAttempt(alice, 7000);
    }

    function test_RevertWhen_InsufficientAllowance() public {
        // Mint but don't approve
        _mintAUSD(alice, ATTEMPT_FEE);

        /// WHEN: trying to submit without allowance
        vm.prank(operatorAddress);
        vm.expectRevert();
        agoRace.submitAttempt(alice, 7000);
    }

}
