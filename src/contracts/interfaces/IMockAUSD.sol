// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.4;

interface IMockAUSD {

    error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed);
    error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed);
    error ERC20InvalidApprover(address approver);
    error ERC20InvalidReceiver(address receiver);
    error ERC20InvalidSender(address sender);
    error ERC20InvalidSpender(address spender);

    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 value);

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);
    function approve(
        address spender,
        uint256 value
    ) external returns (bool);
    function balanceOf(
        address account
    ) external view returns (uint256);
    function burn(
        uint256 _amount
    ) external;
    function decimals() external pure returns (uint8);
    function mint(
        address _to,
        uint256 _amount
    ) external;
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function totalSupply() external view returns (uint256);
    function transfer(
        address to,
        uint256 value
    ) external returns (bool);
    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);

}
