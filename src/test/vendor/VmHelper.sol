// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

// Vendored from agora-finance/agora-standard-solidity (src/VmHelper.sol)
// Test utilities for block manipulation and account setup in Foundry tests.

import { CommonBase } from "forge-std/Base.sol";

contract VmHelper is CommonBase {

    uint256[] internal snapShotIds;
    function()[] internal setupFunctions;

    modifier useMultipleSetupFunctions() {
        if (snapShotIds.length == 0) _;
        for (uint256 i = 0; i < snapShotIds.length; i++) {
            uint256 _originalSnapshotId = vm.snapshot();
            if (!vm.revertTo(snapShotIds[i])) revert VmDidNotRevert(snapShotIds[i]);
            _;
            vm.clearMockedCalls();
            vm.revertTo(_originalSnapshotId);
        }
    }

    function addSetupFunctions(
        function()[] memory _setupFunctions
    ) internal {
        for (uint256 i = 0; i < _setupFunctions.length; i++) {
            _setupFunctions[i]();
            snapShotIds.push(vm.snapshot());
            vm.clearMockedCalls();
        }
    }

    error VmDidNotRevert(uint256 _snapshotId);

    struct MineBlocksResult {
        uint256 timeElapsed;
        uint256 blocksElapsed;
        uint256 currentTimestamp;
        uint256 currentBlockNumber;
    }

    function mineOneBlock() public returns (MineBlocksResult memory result) {
        uint256 timeElapsed = 12;
        uint256 blocksElapsed = 1;
        vm.warp(block.timestamp + timeElapsed);
        vm.roll(block.number + blocksElapsed);
        result.timeElapsed = timeElapsed;
        result.blocksElapsed = blocksElapsed;
        result.currentTimestamp = block.timestamp;
        result.currentBlockNumber = block.number;
    }

    function mineBlocks(
        uint256 _blocks
    ) public returns (MineBlocksResult memory result) {
        uint256 timeElapsed = (12 * _blocks);
        uint256 blocksElapsed = _blocks;
        vm.warp(block.timestamp + timeElapsed);
        vm.roll(block.number + blocksElapsed);
        result.timeElapsed = timeElapsed;
        result.blocksElapsed = blocksElapsed;
        result.currentTimestamp = block.timestamp;
        result.currentBlockNumber = block.number;
    }

    function mineBlocksBySecond(
        uint256 secondsElapsed
    ) public returns (MineBlocksResult memory result) {
        uint256 timeElapsed = secondsElapsed;
        uint256 blocksElapsed = secondsElapsed / 12;
        vm.warp(block.timestamp + timeElapsed);
        vm.roll(block.number + blocksElapsed);
        result.timeElapsed = timeElapsed;
        result.blocksElapsed = blocksElapsed;
        result.currentTimestamp = block.timestamp;
        result.currentBlockNumber = block.number;
    }

    function mineBlocksToTimestamp(
        uint256 _timestamp
    ) public returns (MineBlocksResult memory result) {
        uint256 timeElapsed = _timestamp - block.timestamp;
        uint256 blocksElapsed = timeElapsed / 12;
        vm.warp(_timestamp);
        vm.roll(block.number + blocksElapsed);
        result.timeElapsed = timeElapsed;
        result.blocksElapsed = blocksElapsed;
        result.currentTimestamp = block.timestamp;
        result.currentBlockNumber = block.number;
    }

    function labelAndDeal(
        address _address,
        string memory _label
    ) public returns (address payable) {
        vm.label(_address, _label);
        vm.deal(_address, 1_000_000_000);
        return payable(_address);
    }

    function labelAndDeal(
        string memory _label
    ) public returns (address payable) {
        address _address = address(uint160(uint256(keccak256(bytes(_label)))));
        vm.label(_address, _label);
        vm.deal(_address, 1_000_000_000);
        return payable(_address);
    }

}
