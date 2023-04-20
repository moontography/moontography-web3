import assert from 'assert'
import { createArrayCsvWriter } from 'csv-writer'
import dotenv from 'dotenv'
import { ethers } from 'ethers'
import Web3 from 'web3'
import { getAddressesWithTokenTransfers } from '../../libs/Snapshot'
import OKLGRewardDistributor from '../../libs/web3/OKLGRewardDistributor'

// Initialize environment variables
dotenv.config()

const rewardsContracts: any = {
  bsc: '0x6A67398C803aeFe4f7b6768d42EF76426bFe0F8d',
  homestead: '0x8b61F51F639ADf0d883F6b6E30f2C822B238fC2E',
  mainnet: '0x8b61F51F639ADf0d883F6b6E30f2C822B238fC2E',
}

;(async function takeSnapshot() {
  assert(process.env.NETWORK, 'NETWORK not provided')
  assert(process.env.TOKEN_ADDRESS, 'TOKEN_ADDRESS not provided')
  assert(process.env.INITIAL_BLOCK_NUMBER, 'INITIAL_BLOCK_NUMBER not provided')
  assert(process.env.FINAL_BLOCK_NUMBER, 'FINAL_BLOCK_NUMBER not provided')

  // Currently the script only supports BSC, Rinkeby and the ETH mainnet.
  let provider
  let providerURL
  const rewards = rewardsContracts[process.env.NETWORK.toLowerCase()]
  switch (process.env.NETWORK.toLowerCase()) {
    case 'bsc':
      provider = new ethers.providers.JsonRpcProvider(
        'https://bsc-dataseed.binance.org/'
      )
      providerURL = 'https://bsc-dataseed.binance.org/'
      break
    case 'homestead':
    case 'mainnet':
      assert(process.env.ALCHEMY_KEY, 'ALCHEMY_KEY not provided')
      provider = new ethers.providers.AlchemyProvider(
        'homestead',
        process.env.ALCHEMY_KEY
      )
      providerURL = `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`
      break
    default:
      console.log('The given network is not supported by this script.')
      process.exit(1)
  }

  // Most APIs limit event response data to 2,000 blocks.
  // Hence we split the block range into manageable chunks.
  // Set accordingly to the provider's limits.
  const BLOCK_LIMIT_PER_CALL = 2000
  const startBlockNumber = Number.parseInt(process.env.INITIAL_BLOCK_NUMBER)
  const endBlockNumber = Number.parseInt(process.env.FINAL_BLOCK_NUMBER)
  const [, addressSet] = await getAddressesWithTokenTransfers(
    provider,
    process.env.TOKEN_ADDRESS,
    startBlockNumber,
    endBlockNumber,
    BLOCK_LIMIT_PER_CALL,
    (info: string) => console.log(`token snapshot progress: ${info}`)
  )

  console.log(`Processing rewards balances: ${addressSet.size} total`)

  const rewardsContract = OKLGRewardDistributor(new Web3(providerURL), rewards)

  const info: any = {}
  for (const address of Array.from(addressSet)) {
    const [shares, nfts] = await Promise.all([
      rewardsContract.methods.getBaseShares(address).call(),
      rewardsContract.methods.getBoostNfts(address).call(),
    ])
    info[address] = shares
    // TODO: populate NFTs as well
    console.log(
      `rewards progress: ${(
        (Object.keys(info).length / addressSet.size) *
        100
      ).toFixed(2)}%`
    )
  }

  // Output CSV
  const csvWriter = createArrayCsvWriter({
    header: ['Address', 'Balance'],
    path: 'rewardsBalances.csv',
  })
  await csvWriter.writeRecords(Object.entries(info))
  console.log('Done. View rewardsBalances.csv.')
})()
