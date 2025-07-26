pragma solidity 0.8.23;

import {EscrowFactory} from "../1inch/cross-chain-swap/contracts/EscrowFactory.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TestEscrowFactory is EscrowFactory {
    constructor(
        address limitOrderProtocol,
        IERC20 feeToken,
        IERC20 accessToken,
        address owner,
        uint32 rescueDelaySrc,
        uint32 rescueDelayDst
    )
        EscrowFactory(
            limitOrderProtocol,
            feeToken,
            accessToken,
            owner,
            rescueDelayDst,
            rescueDelayDst
        )
    {}
}
