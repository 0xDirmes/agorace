// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.4;

library AgoraType {

    struct Version {
        uint256 major;
        uint256 minor;
        uint256 patch;
    }

}

interface IAgoraType {

    struct ConstructorParams {
        address token;
        address operator;
    }

    error AlreadySettled();
    error AlreadySignedUp();
    error CompetitionActive();
    error CompetitionNotActive();
    error CompetitionNotEnded();
    error NoPlayers();
    error NotOperator();
    error NotSignedUp();
    error OwnableInvalidOwner(address owner);
    error OwnableUnauthorizedAccount(address account);
    error SafeERC20FailedOperation(address token);
    error ZeroAddress();

    event AttemptSubmitted(address indexed player, uint256 score, uint256 bestScore, uint256 pot);
    event CompetitionStarted(uint256 startTime, uint256 endTime);
    event OperatorUpdated(address indexed newOperator);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Settled(address indexed winner, uint256 prize);
    event SignedUp(address indexed player, uint256 pot);

    function DURATION() external view returns (uint256);
    function ENTRY_FEE() external view returns (uint256);
    function bestScore(
        address _player
    ) external view returns (uint256 _score);
    function endTime() external view returns (uint256);
    function getLeaderboard() external view returns (address[] memory _players, uint256[] memory _scores);
    function getPlayerCount() external view returns (uint256 _count);
    function getPlayerState(
        address _player
    ) external view returns (uint256 _bestScore, bool _hasPlayed);
    function getState()
        external
        view
        returns (uint256 _startTime, uint256 _endTime, uint256 _pot, bool _settled, bool _active, uint256 _playerCount);
    function isPlayer(
        address _player
    ) external view returns (bool _hasPlayed);
    function operator() external view returns (address);
    function owner() external view returns (address);
    function players(
        uint256 _index
    ) external view returns (address _player);
    function pot() external view returns (uint256);
    function renounceOwnership() external;
    function setOperator(
        address _operator
    ) external;
    function settle() external;
    function settled() external view returns (bool);
    function signup() external;
    function startCompetition() external;
    function startTime() external view returns (uint256);
    function submitAttempt(
        address _player,
        uint256 _score
    ) external;
    function token() external view returns (address);
    function transferOwnership(
        address newOwner
    ) external;
    function version() external pure returns (AgoraType.Version memory _version);

}
