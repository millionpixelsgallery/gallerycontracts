//SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetFixedSupply.sol";

contract Vault is ERC20PresetFixedSupply {
    address[] founders;

    bool active;

    uint256 public accumulatedEarnings;
    uint256 public lastBalance;
    uint256 public buyPremium;

    mapping(address => uint256) founderDebt;

    constructor(address[] memory _founders, uint256[] memory _shares)
        ERC20PresetFixedSupply(
            "MillionPixelsGallery",
            "MPG",
            10000000,
            address(this)
        )
    {
        require(_founders.length == _shares.length, "invalid data length");
        for (uint8 i = 0; i < _founders.length; i++) {
            transfer(_founders[i], _shares[i] * 1 ether);
        }
        require(totalSupply() == 10000000 * 1 ether, "not 100% shares");
        founders = _founders;
        buyPremium = 10500; //105%
    }

    receive() external payable {}

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);

        if (from != address(0)) {
            // regular transfer
            require(active, "shares not active");
        }
    }

    function withdraw(uint256 value) external {
        require(active == false, "shares has been activated");

        accumulatedEarnings += payable(address(this)).balance - lastBalance;
        uint256 founderShare =
            (balanceOf(_msgSender()) * accumulatedEarnings) / totalSupply();
        require(
            founderShare >= value + founderDebt[_msgSender()],
            "value not available"
        );
        founderDebt[_msgSender()] += value;
        lastBalance = payable(address(this)).balance;
    }

    function sell(uint256 amount) external {
        require(active, "shares not active");
        require(balanceOf(_msgSender()) >= amount, "not enough balance");
        uint256 share =
            (payable(address(this)).balance * amount) / totalSupply();
        require(share > 0, "not enough in vault");
        _burn(_msgSender(), amount);
        payable(_msgSender()).transfer(share);
    }

    function buy(uint256 amount) external payable {
        require(active, "shares not active");
        uint256 share =
            (payable(address(this)).balance * amount * buyPremium) /
                (totalSupply() * 10000);
        require(share <= msg.value, "payment too low");
        _mint(_msgSender(), amount);
    }
}
