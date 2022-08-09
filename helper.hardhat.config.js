const { ethers } = require("hardhat")

const networkConfig = {
    default: {
        name: "hardhat",
        timeInterval: "30"
    },
    4: {
        name: "rinkeby",
        vrfCoordinatorV2: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
        entranceFee: "100000000000000000", // 0.1 ETH
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        subscriptionId: "10184",
        callbackGasLimit: "500000", // 500,000
        timeInterval: "30" // 30 seconds
    },
    31337: {
        name:"localhost",
        subscriptionId: "588",
        entranceFee: "100000000000000000", // 0.1 ETH
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        callbackGasLimit: "500000",// 500,000
        timeInterval: "30" // 30 seconds
    }
}
const VERIFICATION_BLOCK_CONFIRMATIONS = 6
const developmentChains = ["hardhat", "localhost"];

module.exports = {
    networkConfig,
    developmentChains,
    VERIFICATION_BLOCK_CONFIRMATIONS
}