// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.28;

// ====================================================================
//             _        ______     ___   _______          _
//            / \     .' ___  |  .'   `.|_   __ \        / \
//           / _ \   / .'   \_| /  .-.  \ | |__) |      / _ \
//          / ___ \  | |   ____ | |   | | |  __ /      / ___ \
//        _/ /   \ \_\ `.___]  |\  `-'  /_| |  \ \_  _/ /   \ \_
//       |____| |____|`._____.'  `.___.'|____| |___||____| |____|
// ====================================================================
// ============================ AgoraType =============================
// ====================================================================

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice The ```ConstructorParams``` struct is used to initialize the AgoraType contract
/// @param token The address of the entry token (e.g., AUSD)
/// @param operator The address of the operator who can submit attempts
struct ConstructorParams {
    address token;
    address operator;
}

/// @title AgoraType
/// @notice Weekly typing competition with on-chain prize pool
/// @dev Players deposit tokens, pay entry fee per attempt, highest score wins the pot
/// @author Agora
contract AgoraType is Ownable {

    using SafeERC20 for IERC20;

    //==============================================================================
    // Structs
    //==============================================================================

    /// @notice The ```Version``` struct represents the contract version
    struct Version {
        uint256 major;
        uint256 minor;
        uint256 patch;
    }

    //==============================================================================
    // Errors
    //==============================================================================

    /// @notice Thrown when attempting to settle an already settled competition
    error AlreadySettled();

    /// @notice Thrown when a player attempts to sign up more than once
    error AlreadySignedUp();

    /// @notice Thrown when attempting to start a new competition while one is active
    error CompetitionActive();

    /// @notice Thrown when an action requires an active competition but none is running
    error CompetitionNotActive();

    /// @notice Thrown when attempting to settle before the competition end time
    error CompetitionNotEnded();

    /// @notice Thrown when attempting to settle with no registered players
    error NoPlayers();

    /// @notice Thrown when a non-operator attempts an operator-only action
    error NotOperator();

    /// @notice Thrown when submitting an attempt for a player who hasn't signed up
    error NotSignedUp();

    /// @notice Thrown when a zero address is provided where not allowed
    error ZeroAddress();

    //==============================================================================
    // Events
    //==============================================================================

    /// @notice Emitted when a player submits a typing attempt
    /// @param player The player's address
    /// @param score The score achieved in this attempt
    /// @param bestScore The player's best score (may be unchanged if this attempt was worse)
    /// @param pot The current prize pot total
    event AttemptSubmitted(address indexed player, uint256 score, uint256 bestScore, uint256 pot);

    /// @notice Emitted when a new competition is started
    /// @param startTime The competition start timestamp
    /// @param endTime The competition end timestamp
    event CompetitionStarted(uint256 startTime, uint256 endTime);

    /// @notice Emitted when the operator address is updated
    /// @param newOperator The new operator address
    event OperatorUpdated(address indexed newOperator);

    /// @notice Emitted when a competition is settled and the winner is paid
    /// @param winner The winning player's address
    /// @param prize The prize amount transferred to the winner
    event Settled(address indexed winner, uint256 prize);

    /// @notice Emitted when a player signs up for the competition
    /// @param player The player's address
    /// @param pot The new prize pot total after signup
    event SignedUp(address indexed player, uint256 pot);

    //==============================================================================
    // ERC7201 Storage
    //==============================================================================

    /// @notice Player state packed into single storage slot
    /// @param bestScore Best score achieved, scaled by 100 (uint32 = 4 bytes)
    /// @param signedUp Whether player has signed up for current competition (bool = 1 byte)
    /// @dev Total: 5 bytes, fits in single 32-byte slot
    struct PlayerState {
        uint32 bestScore;
        bool signedUp;
    }

    /// @notice Storage layout for player-related data
    /// @param playerState Mapping of player address to their state
    /// @param players Array of all players who have submitted attempts
    /// @custom:storage-location erc7201:AgoraType.PlayerStorage
    struct PlayerStorage {
        mapping(address player => PlayerState state) playerState;
        address[] players;
    }

    /// @dev Pre-computed storage slot for PlayerStorage
    /// @dev keccak256(abi.encode(uint256(keccak256("AgoraType.PlayerStorage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant _PLAYER_STORAGE_SLOT = 0xeaa2e3eb337c0f0538e92113a18cbf9c5a274d01b3f0a9abfb10faa475a60b00;

    /// @notice Returns a pointer to the PlayerStorage struct
    /// @return _s Storage pointer to PlayerStorage
    function _getPlayerStorage() private pure returns (PlayerStorage storage _s) {
        /// @solidity memory-safe-assembly
        assembly {
            _s.slot := _PLAYER_STORAGE_SLOT
        }
    }

    //==============================================================================
    // Constants
    //==============================================================================

    /// @notice One-time entry fee for unlimited plays (10 tokens with 6 decimals)
    uint256 public constant ENTRY_FEE = 10e6;

    /// @notice Competition duration (7 days)
    uint256 public constant DURATION = 7 days;

    //==============================================================================
    // Immutables
    //==============================================================================

    /// @notice The token used for deposits and prizes
    IERC20 public immutable token;

    //==============================================================================
    // Storage
    //==============================================================================

    /// @notice The operator address that can submit attempts on behalf of players
    address public operator;

    /// @notice Competition start timestamp
    uint256 public startTime;

    /// @notice Competition end timestamp
    uint256 public endTime;

    /// @notice Total prize pot accumulated from entry fees
    uint256 public pot;

    /// @notice Whether the competition has been settled
    bool public settled;

    //==============================================================================
    // Constructor
    //==============================================================================

    /// @notice The ```constructor``` function initializes the AgoraType contract
    /// @param _params The constructor parameters
    constructor(
        ConstructorParams memory _params
    ) Ownable(msg.sender) {
        if (_params.token == address(0)) revert ZeroAddress();
        if (_params.operator == address(0)) revert ZeroAddress();

        token = IERC20(_params.token);
        operator = _params.operator;
    }

    //==============================================================================
    // Modifiers
    //==============================================================================

    /// @notice Restricts access to the operator or owner
    modifier onlyOperator() {
        if (msg.sender != operator && msg.sender != owner()) revert NotOperator();
        _;
    }

    /// @notice Restricts access to when the competition is active
    modifier whenActive() {
        if (block.timestamp < startTime || block.timestamp >= endTime || settled) revert CompetitionNotActive();
        _;
    }

    //==============================================================================
    // Admin Functions
    //==============================================================================

    /// @notice The ```startCompetition``` function starts a new competition
    /// @dev Clears previous competition state. Owner only.
    function startCompetition() external onlyOwner {
        if (startTime != 0 && !settled) revert CompetitionActive();

        // Reset state for new competition
        startTime = block.timestamp;
        endTime = block.timestamp + DURATION;
        settled = false;

        // Clear previous players' scores and tracking
        PlayerStorage storage _s = _getPlayerStorage();
        uint256 _playersLength = _s.players.length;
        for (uint256 i = 0; i < _playersLength; i++) {
            delete _s.playerState[_s.players[i]];
        }
        delete _s.players;

        emit CompetitionStarted(startTime, endTime);
    }

    /// @notice The ```setOperator``` function updates the operator address
    /// @param _operator The new operator address
    function setOperator(
        address _operator
    ) external onlyOwner {
        if (_operator == address(0)) revert ZeroAddress();
        operator = _operator;
        emit OperatorUpdated(_operator);
    }

    /// @notice The ```settle``` function settles the competition and pays the winner
    /// @dev Can only be called after competition ends. Owner only.
    function settle() external onlyOwner {
        if (block.timestamp < endTime) revert CompetitionNotEnded();
        if (settled) revert AlreadySettled();

        PlayerStorage storage _s = _getPlayerStorage();
        if (_s.players.length == 0) revert NoPlayers();

        // Find winner (highest score)
        address _winner;
        uint256 _highestScore;
        uint256 _playersLength = _s.players.length;
        for (uint256 i = 0; i < _playersLength; i++) {
            address _player = _s.players[i];
            uint256 _score = _s.playerState[_player].bestScore;
            // NOTE: in case of tie, first to reach score wins
            if (_score > _highestScore) {
                _highestScore = _score;
                _winner = _player;
            }
        }

        settled = true;
        uint256 _prize = pot;
        pot = 0;

        token.safeTransfer(_winner, _prize);
        emit Settled(_winner, _prize);
    }

    //==============================================================================
    // Player Functions
    //==============================================================================

    /// @notice The ```signup``` function registers a player for the current competition
    /// @dev Requires prior ERC20 approval. Charges ENTRY_FEE immediately.
    function signup() external whenActive {
        PlayerStorage storage _s = _getPlayerStorage();
        PlayerState storage _state = _s.playerState[msg.sender];

        if (_state.signedUp) revert AlreadySignedUp();

        token.safeTransferFrom(msg.sender, address(this), ENTRY_FEE);
        pot += ENTRY_FEE;
        _state.signedUp = true;
        _s.players.push(msg.sender);

        emit SignedUp(msg.sender, pot);
    }

    //==============================================================================
    // Operator Functions
    //==============================================================================

    /// @notice The ```submitAttempt``` function submits an attempt on behalf of a player
    /// @dev Only callable by operator. Player must have signed up first.
    /// @param _player The player's address
    /// @param _score The calculated score (WPM * accuracy, scaled by 100)
    function submitAttempt(
        address _player,
        uint256 _score
    ) external onlyOperator whenActive {
        PlayerStorage storage _s = _getPlayerStorage();
        PlayerState storage _state = _s.playerState[_player];

        if (!_state.signedUp) revert NotSignedUp();

        if (_score > _state.bestScore) _state.bestScore = uint32(_score);

        emit AttemptSubmitted(_player, _score, _state.bestScore, pot);
    }

    //==============================================================================
    // View Functions
    //==============================================================================

    /// @notice The ```getState``` function returns the current competition state
    /// @return _startTime Competition start timestamp
    /// @return _endTime Competition end timestamp
    /// @return _pot Current prize pot
    /// @return _settled Whether the competition has been settled
    /// @return _active Whether the competition is currently active
    /// @return _playerCount Number of players who have played
    function getState()
        external
        view
        returns (uint256 _startTime, uint256 _endTime, uint256 _pot, bool _settled, bool _active, uint256 _playerCount)
    {
        bool _isActive = block.timestamp >= startTime && block.timestamp < endTime && !settled;
        return (startTime, endTime, pot, settled, _isActive, _getPlayerStorage().players.length);
    }

    /// @notice The ```bestScore``` function returns a player's best score
    /// @param _player The player's address
    /// @return _score Player's best score in current competition
    function bestScore(
        address _player
    ) external view returns (uint256 _score) {
        return _getPlayerStorage().playerState[_player].bestScore;
    }

    /// @notice The ```getPlayerState``` function returns a player's current state
    /// @param _player The player's address
    /// @return _bestScore Player's best score in current competition
    /// @return _hasPlayed Whether the player has signed up for current competition
    function getPlayerState(
        address _player
    ) external view returns (uint256 _bestScore, bool _hasPlayed) {
        PlayerState storage _state = _getPlayerStorage().playerState[_player];
        return (_state.bestScore, _state.signedUp);
    }

    /// @notice The ```getLeaderboard``` function returns player addresses and scores
    /// @dev Returns unsorted data. Frontend should sort by score descending.
    /// @return _players Array of player addresses
    /// @return _scores Array of corresponding best scores
    function getLeaderboard() external view returns (address[] memory _players, uint256[] memory _scores) {
        PlayerStorage storage _s = _getPlayerStorage();
        uint256 _count = _s.players.length;
        _players = new address[](_count);
        _scores = new uint256[](_count);

        for (uint256 i = 0; i < _count; i++) {
            _players[i] = _s.players[i];
            _scores[i] = _s.playerState[_s.players[i]].bestScore;
        }
    }

    /// @notice The ```getPlayerCount``` function returns the total number of players
    /// @return _count Number of players
    function getPlayerCount() external view returns (uint256 _count) {
        return _getPlayerStorage().players.length;
    }

    /// @notice The ```isPlayer``` function checks if an address has played
    /// @param _player The address to check
    /// @return _hasPlayed Whether the address has played
    function isPlayer(
        address _player
    ) external view returns (bool _hasPlayed) {
        return _getPlayerStorage().playerState[_player].signedUp;
    }

    /// @notice The ```players``` function returns a player address by index
    /// @param _index The index in the players array
    /// @return _player The player address
    function players(
        uint256 _index
    ) external view returns (address _player) {
        return _getPlayerStorage().players[_index];
    }

    //==============================================================================
    // Version
    //==============================================================================

    /// @notice The ```version``` function returns the contract version
    /// @return _version The version struct
    function version() public pure returns (Version memory _version) {
        _version = Version({ major: 1, minor: 0, patch: 0 });
    }

}
