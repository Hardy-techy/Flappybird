// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract FlappyLivesOffChain {
    address public owner;

    event LivesPurchased(address indexed player, uint256 amountPaid, uint256 livesGiven);
    event Withdraw(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // Buy lives: no on-chain tracking, just payment
    function buyLives(uint256 amount) external payable {
        require(amount == 5 || amount == 15, "Can only buy 5 or 15 lives");
        uint256 price = amount == 5 ? 0.05 ether : 0.1 ether;
        require(msg.value == price, "Incorrect payment");
        emit LivesPurchased(msg.sender, msg.value, amount);
    }

    // Owner can withdraw native STT tokens
    function withdraw(address payable to) external onlyOwner {
        uint256 bal = address(this).balance;
        require(bal > 0, "No balance to withdraw");
        (bool sent, ) = to.call{value: bal}("");
        require(sent, "Withdraw failed");
        emit Withdraw(to, bal);
    }
} 