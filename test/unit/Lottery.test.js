const { assert, expect } = require("chai")
const { ethers, deployments, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper.hardhat.config")

// skip testing if deploying at hardhat network
!developmentChains.includes(network.name) ? describe.skip : describe("Lottery", async () => {
    let lottery, vrfCoordinatorV2Mock, lotteryEntranceFee, deployer, timeInterval, lotteryState
    const chainId = network.config.chainId
    
    beforeEach(async () => {
        accounts = await ethers.getSigners() 
        deployer = accounts[0]
        player = accounts[1]
        await deployments.fixture(["mocks", "lottery"]) // Deploys modules with the tags "mocks" and "lottery"
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        lotteryContract = await ethers.getContract("Lottery", deployer.address) // Returns a new connection to the Lottery contract
        lottery = lotteryContract.connect(player) // Returns a new instance of the Raffle contract connected to player
        // lottery = lotteryContract.connect(player) 
        lotteryEntranceFee = await lottery.getEntranceFee()
        timeInterval = await lottery.getTimeInterval()
        lotteryState = await lottery.getLotteryState()
    })
    describe("Constructor", () =>{
            it("initializes the lottery state correctly", async () => {
                assert.equal(lotteryState.toString(), "0") 
            })
            it("initializes the time interval correctly", async () => {
                assert.equal(timeInterval.toString(), networkConfig[chainId]["timeInterval"]) 
            })
            it("initializes the entrance fee correctly", async () => {
                assert.equal(lotteryEntranceFee.toString(), networkConfig[chainId]["entranceFee"]) 
            })
            it("initializes the callback gas limit correctly", async () => {
                const callbackGasLimit = await lottery.getCallbackGasLimit()
                assert.equal(callbackGasLimit.toString(), "500000") 
            })
    })
    describe("enterLottery", () => {
        it("reverts when you don't pay enough", async () => {
            await expect(lottery.enterLottery()).to.be.revertedWith("Lottery__NotEnoughETH")
        })
        it("records players when they enter", async () => {
           await lottery.enterLottery({ value: lotteryEntranceFee })
           const playerFromContract = await lottery.getPlayer(0)
           assert.equal(playerFromContract, player.address)
        })
        it("emits event on enter", async () => {
            await expect(lottery.enterLottery({ value: lotteryEntranceFee })).to.emit(lottery, "LotteryEnter")
        })
        
        it("doesn't allow entrance when not open", async () => {
            await lottery.enterLottery({ value: lotteryEntranceFee })
            // increase time 
            await network.provider.send("evm_increaseTime", [timeInterval.toNumber() + 1])
            // mine block
            await network.provider.request({ method: "evm_mine", params: [] })
            await lottery.performUpkeep([]) // changes the state to calculating for our comparison below
            // Pretend to be a Chainlink Keeper to turn the lottery state to "PENDING"
            // State now should be "PENDING"
            await expect(lottery.enterLottery({ value: lotteryEntranceFee })).to.be.revertedWith( 
                      "Lottery__NotOpen"
            )
        })
    })
    describe("checkUpkeep", () =>{
        it("return false if people haven't sent any ETH", async () => {
            // Increase time and mine a block
            await network.provider.send("evm_increaseTime", [timeInterval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] })
            const {upkeepNeeded} = await lottery.callStatic.checkUpkeep([])
            assert(!upkeepNeeded)
        })
        it("return false if the lottery is not open", async () => {
            // Call enterLottery to turn hasPlayers into true
            await lottery.enterLottery({ value: lotteryEntranceFee })
            // Increase time and mine a block
            await network.provider.send("evm_increaseTime", [timeInterval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] })
            
            await lottery.performUpkeep("0x")
            lotteryState = await lottery.getLotteryState()
            assert.equal(lotteryState.toString(), "1")
            const {upkeepNeeded} = await lottery.callStatic.checkUpkeep([])
            assert(!upkeepNeeded)
        })
        it("returns false if enough time hasn't passed", async () => {
            await lottery.enterLottery({ value: lotteryEntranceFee })
            await network.provider.send("evm_increaseTime", [timeInterval.toNumber() - 10])
            await network.provider.request({ method: "evm_mine", params: [] })
            const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
            assert(!upkeepNeeded)
        })
        it("returns true if enough time has passed, has players, eth, and is open", async () => {
            await lottery.enterLottery({ value: lotteryEntranceFee })
            await network.provider.send("evm_increaseTime", [timeInterval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] })
            const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
            assert(upkeepNeeded)
        })
    })
    describe("performUpkeep", () => {
        it("can only run if checkUpkeep is true", async () => {
            await lottery.enterLottery({ value: lotteryEntranceFee })
            await network.provider.send("evm_increaseTime", [timeInterval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] })
            const tx = await lottery.performUpkeep([])
            assert(tx)
        })
        it("reverts when checkUpkeep is false", async () => {
            await expect(lottery.performUpkeep([])).to.be.revertedWith("Lottery__UpkeepNotNeeded") 
        })
        it("updates the lottery state", async () => {
            await lottery.enterLottery({ value: lotteryEntranceFee })
            await network.provider.send("evm_increaseTime", [timeInterval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] })

            const txResponse = await lottery.performUpkeep([])
            const txReceipt = await txResponse.wait(1)
            lotteryState = await lottery.getLotteryState()
            assert.equal(lotteryState, 1)
        })
        it("updates the lottery state", async () => {
            await expect(lottery.performUpkeep([])).to.be.revertedWith("Lottery__UpkeepNotNeeded") 
        })
    })
    describe("fulfillRandomWords", () => {
        beforeEach(async () => {
            await lottery.enterLottery({ value: lotteryEntranceFee })
            await network.provider.send("evm_increaseTime", [timeInterval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] })
        })
        it("can only be called after performUpkeep", async () => {
            await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, lottery.address)).to.be.revertedWith("nonexistent request")
            await expect(vrfCoordinatorV2Mock.fulfillRandomWords(1, lottery.address)).to.be.revertedWith("nonexistent request")
        })
        it("picks a winner, resets and sends money", async () => {
            const additionalEntrances = 3 // to test
            const startingIndex = 2
            for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) { // i = 2; i < 5; i=i+1
                lottery = lottery.connect(accounts[i]) // Returns a new instance of the Lottery contract connected to player
                await lottery.enterLottery({ value: lotteryEntranceFee })
            }
            const startingTimeStamp = await lottery.getLatestTimeStamp()
            const winnerStartingBalance = await accounts[2].getBalance()

            await new Promise(async (resolve, reject) => {
                lottery.once("WinnerPicked", async () => {
                    console.log("Event emitted")
                    try {
                        const recentWinner = await lottery.getRecentWinner()
                        lotteryState = await lottery.getLotteryState()
                        const endingTimeStamp = await lottery.getLatestTimeStamp()
                        numPlayers = await lottery.getNumPlayers()
                        const winnerEndingBalance = await accounts[2].getBalance()
                        assert.equal(numPlayers.toString(), "0")
                        assert.equal(lotteryState, 0)
                        assert(endingTimeStamp > startingTimeStamp)
                        assert.equal(winnerEndingBalance.toString(), winnerStartingBalance.add(lotteryEntranceFee.mul(4)).toString()) 
                        resolve()
                    } catch (e) {
                        reject(e)
                    }
                })
                const tx = await lottery.performUpkeep([])
                const txReceipt = await tx.wait(1)
                await vrfCoordinatorV2Mock.fulfillRandomWords(txReceipt.events[1].args.requestId, lottery.address)
            })
        })
    })
})











  
