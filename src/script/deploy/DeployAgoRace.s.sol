// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.28;

import { ContractManager, Contract, Deployment } from "deploy-framework/ContractManager.sol";
import { IVersioned } from "deploy-framework/interfaces/IVersioned.sol";
import { AgoraProxyAdmin } from "agora-contracts/proxy/AgoraProxyAdmin.sol";
import {
    AgoraTransparentUpgradeableProxy,
    ConstructorParams as ProxyParams
} from "agora-contracts/proxy/AgoraTransparentUpgradeableProxy.sol";
import { AgoRace, ConstructorParams } from "contracts/AgoRace.sol";

/// @title DeployAgoRace
/// @notice Deployment script for AgoRace using the evm-deployments framework
/// @dev Uses CREATE3 for deterministic deployment addresses across chains
/// @dev Deploys: AgoRaceProxyAdmin + AgoRaceImpl + AgoRaceImplProxy
contract DeployAgoRace is ContractManager {
    /// @notice Main deployment entry point with parameters
    function run(address _owner, address _token, address _operator) external broadcaster {
        // 1. Deploy ProxyAdmin
        address proxyAdmin = _deployProxyAdmin();

        // 2. Deploy Implementation
        address impl = _deployImplementation();

        // 3. Deploy Proxy with init data
        bytes memory initData = abi.encodeWithSelector(
            AgoRace.initialize.selector,
            ConstructorParams({ initialOwner: _owner, token: _token, operator: _operator })
        );

        deployProxy({
            _implementationName: "AgoRace",
            _implementationAddress: impl,
            _proxyAdminAddress: proxyAdmin,
            _initData: initData
        });
    }

    /// @notice Deploy the ProxyAdmin contract
    function _deployProxyAdmin() internal returns (address) {
        return deployContract(
            Deployment({
                _name: "AgoRaceProxyAdmin",
                _creationCode: type(AgoraProxyAdmin).creationCode,
                _constructorArgs: abi.encode(msg.sender),
                _expectedVersion: IVersioned.Version({ major: 1, minor: 0, patch: 0 })
            })
        ).deploymentAddress;
    }

    /// @notice Deploy the AgoRace implementation contract
    function _deployImplementation() internal returns (address) {
        return deployContract(
            Deployment({
                _name: "AgoRaceImpl",
                _creationCode: type(AgoRace).creationCode,
                _constructorArgs: "",
                _expectedVersion: IVersioned.Version({ major: 3, minor: 1, patch: 0 })
            })
        ).deploymentAddress;
    }

    //==============================================================================
    // ContractManager abstract implementation
    //==============================================================================

    /// @notice Returns AgoraTransparentUpgradeableProxy creation code
    function _getProxyCreationCode() internal pure override returns (bytes memory) {
        return type(AgoraTransparentUpgradeableProxy).creationCode;
    }

    /// @notice Encodes proxy constructor arguments for AgoraTransparentUpgradeableProxy
    function _encodeProxyConstructorArgs(
        address _implementation,
        address _proxyAdminAddress,
        bytes memory _initData
    ) internal pure override returns (bytes memory) {
        return abi.encode(ProxyParams({ logic: _implementation, proxyAdminAddress: _proxyAdminAddress, data: _initData }));
    }
}
