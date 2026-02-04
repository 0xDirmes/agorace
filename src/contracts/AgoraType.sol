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

    error AlreadySettled();
    error CompetitionActive();
    error CompetitionNotActive();
    error CompetitionNotEnded();
    error InsufficientDeposit(address player, uint256 required, uint256 available);
    error NoPlayers();
    error NotOperator();
    error ZeroAddress();
    error ZeroAmount();

    //==============================================================================
    // Events
    //==============================================================================

    event AttemptSubmitted(address indexed player, uint256 score, uint256 bestScore, uint256 pot);
    event CompetitionStarted(uint256 startTime, uint256 endTime);
    event Deposited(address indexed player, uint256 amount, uint256 newBalance);
    event OperatorUpdated(address indexed newOperator);
    event Settled(address indexed winner, uint256 prize);
    event Withdrawn(address indexed player, uint256 amount, uint256 newBalance);

    //==============================================================================
    // ERC7201 Storage
    //==============================================================================

    /// @notice Player state packed into single storage slot
    /// @param deposit Available balance for entry fees (uint128 = 16 bytes)
    /// @param bestScore Best score achieved, scaled by 100 (uint32 = 4 bytes)
    /// @param hasPlayed Whether player has entered current competition (bool = 1 byte)
    /// @dev Total: 21 bytes, fits in single 32-byte slot
    struct PlayerState {
        uint128 deposit;
        uint32 bestScore;
        bool hasPlayed;
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
        pot = 0;
        settled = false;

        // Clear previous players' scores and tracking
        PlayerStorage storage _s = _getPlayerStorage();
        uint256 _playersLength = _s.players.length;
        for (uint256 i = 0; i < _playersLength; i++) {
            _s.playerState[_s.players[i]].bestScore = 0;
            _s.playerState[_s.players[i]].hasPlayed = false;
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
            uint256 _score = _s.playerState[_s.players[i]].bestScore;
            if (_score > _highestScore) {
                _highestScore = _score;
                _winner = _s.players[i];
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

    /// @notice The ```deposit``` function allows a player to deposit tokens for playing
    /// @dev Requires prior token approval
    /// @param _amount The amount of tokens to deposit
    function deposit(
        uint256 _amount
    ) external {
        if (_amount == 0) revert ZeroAmount();

        token.safeTransferFrom(msg.sender, address(this), _amount);
        PlayerState storage _state = _getPlayerStorage().playerState[msg.sender];
        _state.deposit += uint128(_amount);

        emit Deposited(msg.sender, _amount, _state.deposit);
    }

    /// @notice The ```withdraw``` function allows a player to withdraw their unused deposit
    /// @param _amount The amount of tokens to withdraw
    function withdraw(
        uint256 _amount
    ) external {
        if (_amount == 0) revert ZeroAmount();

        PlayerState storage _state = _getPlayerStorage().playerState[msg.sender];
        uint128 _deposit = _state.deposit;
        if (_deposit < _amount) revert InsufficientDeposit(msg.sender, _amount, _deposit);

        _state.deposit = _deposit - uint128(_amount);
        token.safeTransfer(msg.sender, _amount);

        emit Withdrawn(msg.sender, _amount, _state.deposit);
    }

    //==============================================================================
    // Operator Functions
    //==============================================================================

    /// @notice The ```submitAttempt``` function submits an attempt on behalf of a player
    /// @dev Only callable by operator. Deducts entry fee from player's deposit.
    /// @param _player The player's address
    /// @param _score The calculated score (WPM * accuracy, scaled by 100)
    function submitAttempt(
        address _player,
        uint256 _score
    ) external onlyOperator whenActive {
        PlayerStorage storage _s = _getPlayerStorage();
        PlayerState storage _state = _s.playerState[_player];

        // Only charge entry fee on first attempt
        if (!_state.hasPlayed) {
            if (_state.deposit < ENTRY_FEE) revert InsufficientDeposit(_player, ENTRY_FEE, _state.deposit);

            _state.deposit -= uint128(ENTRY_FEE);
            pot += ENTRY_FEE;
            _state.hasPlayed = true;
            _s.players.push(_player);
        }

        // Update best score if improved (always, even on subsequent attempts)
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

    /// @notice The ```deposits``` function returns a player's deposit balance
    /// @param _player The player's address
    /// @return _deposit Player's current deposit balance
    function deposits(
        address _player
    ) external view returns (uint256 _deposit) {
        return _getPlayerStorage().playerState[_player].deposit;
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
    /// @return _deposit Player's current deposit balance
    /// @return _bestScore Player's best score in current competition
    /// @return _hasPlayed Whether the player has played in current competition
    function getPlayerState(
        address _player
    ) external view returns (uint256 _deposit, uint256 _bestScore, bool _hasPlayed) {
        PlayerState storage _state = _getPlayerStorage().playerState[_player];
        return (_state.deposit, _state.bestScore, _state.hasPlayed);
    }

    /// @notice The ```getLeaderboard``` function returns player addresses and scores
    /// @dev Returns unsorted data. Frontend should sort by score descending.
    /// @param _limit Maximum number of players to return
    /// @return _players Array of player addresses
    /// @return _scores Array of corresponding best scores
    function getLeaderboard(
        uint256 _limit
    ) external view returns (address[] memory _players, uint256[] memory _scores) {
        PlayerStorage storage _s = _getPlayerStorage();
        uint256 _count = _s.players.length < _limit ? _s.players.length : _limit;
        _players = new address[](_count);
        _scores = new uint256[](_count);

        for (uint256 i = 0; i < _count; i++) {
            _players[i] = _s.players[i];
            _scores[i] = _s.playerState[_s.players[i]].bestScore;
        }
        return (_players, _scores);
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
        return _getPlayerStorage().playerState[_player].hasPlayed;
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
