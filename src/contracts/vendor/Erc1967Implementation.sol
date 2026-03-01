// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.0;

// Vendored from agora-finance/evm-deployments (agora-contracts/proxy/Erc1967Implementation.sol)
// Provides ERC-1967 storage slot accessors for proxy admin and implementation addresses.

/// @title Erc1967Implementation
/// @notice Provides visibility into Erc1967 proxy admin and implementation storage slots.
/// @author Agora
abstract contract Erc1967Implementation {

    //==============================================================================
    // Erc1967 Admin Slot Items
    //==============================================================================

    /// @param proxyAdminAddress The address of the proxy admin contract
    /// @custom:storage-location erc1967:eip1967.proxy.admin
    struct Erc1967ProxyAdminStorage {
        address proxyAdminAddress;
    }

    /// @dev bytes32(uint256(keccak256("eip1967.proxy.admin")) - 1)
    bytes32 internal constant ERC1967_PROXY_ADMIN_STORAGE_SLOT_ =
        0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;

    function getPointerToErc1967ProxyAdminStorage() internal pure returns (Erc1967ProxyAdminStorage storage adminSlot) {
        /// @solidity memory-safe-assembly
        assembly {
            adminSlot.slot := ERC1967_PROXY_ADMIN_STORAGE_SLOT_
        }
    }

    function proxyAdminAddress() external view returns (address) {
        return getPointerToErc1967ProxyAdminStorage().proxyAdminAddress;
    }

    //==============================================================================
    // EIP1967 Proxy Implementation Slot Items
    //==============================================================================

    /// @param implementationAddress The address of the implementation contract
    /// @custom:storage-location erc1967:eip1967.proxy.implementation
    struct Erc1967ProxyContractStorage {
        address implementationAddress;
    }

    /// @dev bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1)
    bytes32 internal constant ERC1967_IMPLEMENTATION_CONTRACT_STORAGE_SLOT_ =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    function getPointerToImplementationStorage()
        internal
        pure
        returns (Erc1967ProxyContractStorage storage implementationSlot)
    {
        /// @solidity memory-safe-assembly
        assembly {
            implementationSlot.slot := ERC1967_IMPLEMENTATION_CONTRACT_STORAGE_SLOT_
        }
    }

    function implementationAddress() external view returns (address) {
        return getPointerToImplementationStorage().implementationAddress;
    }

}
