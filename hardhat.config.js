/** @type import('hardhat/config').HardhatUserConfig */

require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

const RINKEBY_RPC_URL = process.env.RINKEBY_RPC_URL
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x"

module.exports = {
  networks: {
    hardhat: {
      chainId: 31337,
      blockConfirmations: 1,
    },
    rinkeby: {
      url: RINKEBY_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 4,
      blockConfirmations: 6,
    }
  },
  etherscan: {
    apiKey: {
        rinkeby: ETHERSCAN_API_KEY,
    },
    customChains: [
        {
            network: "rinkeby",
            chainId: 4,
            urls: {
                apiURL: "https://api-rinkeby.etherscan.io/api",
                browserURL: "https://rinkeby.etherscan.io",
            },
        },
    ],
},
  solidity: "0.8.9",
  namedAccounts: {
    deployer: {
      default: 0,
    },
    player: {
      default: 1,
    },
  },
  gasReporter: {
    enabled: false,
    outputFile: "gas-report.txt",
    noColors: true,
    currency: "USD",
    // coinmarketcap: COINMARKETCAP_API_KEY,
  },
  mocha: {
    timeout: 360000, // 6 minutes max for running tests
  }
};
