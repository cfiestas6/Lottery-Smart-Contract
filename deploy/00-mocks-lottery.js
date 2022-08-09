const { getNamedAccounts, deployments, network, ethers } = require("hardhat")
const { developmentChains } = require("../helper.hardhat.config")

const BASE_FEE = ethers.utils.parseEther("0.25") // base fee price for chainlink vrf Coordinator.
const GAS_PRICE_LINK = 1e9 // = 1000000000 // calculated value based on the price of the chain.

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log} = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId;

    
    if(developmentChains.includes(network.name)){
        log("Local network detected. Deploying mocks...")
        // Deploy mock vrf coordinator
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            logs: true,
            args: [BASE_FEE, GAS_PRICE_LINK]
        })
        log("Mocks deployed.")
        log("----------------------------------")

    }
}
module.exports.tags = ["all", "mocks"]