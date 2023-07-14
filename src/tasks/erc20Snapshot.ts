import assert from 'assert'
import { createArrayCsvWriter } from 'csv-writer'
import dotenv from 'dotenv'
import { ethers } from 'ethers'
import { getAddressesWithTokenTransfers } from '../libs/Snapshot'

// Initialize environment variables
dotenv.config()
;(async function takeSnapshot() {
  assert(process.env.NETWORK, 'NETWORK not provided')
  assert(process.env.TOKEN_ADDRESS, 'TOKEN_ADDRESS not provided')
  assert(process.env.INITIAL_BLOCK_NUMBER, 'INITIAL_BLOCK_NUMBER not provided')
  assert(process.env.FINAL_BLOCK_NUMBER, 'FINAL_BLOCK_NUMBER not provided')

  // This is a very small subset of the token contract's ABI. Specifically it only contains necessary parts of the
  // contract to obtain the unique holder addresses and their token balance.
  const tokenABI = [
    'function balanceOf(address user) external view returns (uint256)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
  ]

  // Currently the script only supports BSC, Rinkeby and the ETH mainnet.
  let provider = undefined
  switch (process.env.NETWORK.toLowerCase()) {
    case 'bsc':
      provider = new ethers.providers.JsonRpcProvider(
        'https://bsc-dataseed.binance.org/'
      )
      break
    case 'eth':
    case 'homestead':
    case 'mainnet':
      // NOTE: Infura node needs archive data for this to work correctly
      // assert(process.env.INFURA_KEY, 'INFURA_KEY not provided')
      // provider = new ethers.providers.InfuraProvider(
      //   'homestead',
      //   process.env.INFURA_KEY
      // )
      assert(process.env.ALCHEMY_KEY, 'ALCHEMY_KEY not provided')
      provider = new ethers.providers.AlchemyProvider(
        'homestead',
        process.env.ALCHEMY_KEY
      )
      break
    case 'rinkeby':
      provider = new ethers.providers.AlchemyProvider(
        process.env.NETWORK,
        process.env.ALCHEMY_KEY
      )
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
  const [tokenContract, index] = await getAddressesWithTokenTransfers(
    provider,
    process.env.TOKEN_ADDRESS,
    startBlockNumber,
    endBlockNumber,
    BLOCK_LIMIT_PER_CALL,
    undefined,
    (info: string) => console.log(info)
  )

  console.log(`Processing balances: ${index.size} total`)
  const balances: any = {}
  for (const address of Array.from(index)) {
    balances[address] = await tokenContract.balanceOf(address, {
      blockTag: endBlockNumber,
    })
    console.log(
      `${((Object.keys(balances).length / index.size) * 100).toFixed(2)}%`
    )
  }

  // Output CSV
  const fileName = `balances_${Date.now()}.csv`
  const csvWriter = createArrayCsvWriter({
    header: ['Address', 'Balance'],
    path: fileName,
  })
  await csvWriter.writeRecords(Object.entries(balances))
  console.log(`Done. View ${fileName}.`)
})()
