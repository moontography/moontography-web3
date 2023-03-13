import assert from 'assert'
import { createArrayCsvWriter } from 'csv-writer'
import dotenv from 'dotenv'
import { ethers } from 'ethers'

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

  const tokenContract = new ethers.Contract(
    process.env.TOKEN_ADDRESS,
    tokenABI,
    provider
  )
  const transferEventsFilter = tokenContract.filters.Transfer()

  // Most APIs limit event response data to 2,000 blocks. Hence we split the block range into manageable chunks. Set
  // accordingly to the provider's limits.
  const BLOCK_LIMIT_PER_CALL = 2000
  const startBlockNumber = Number.parseInt(process.env.INITIAL_BLOCK_NUMBER)
  const endBlockNumber = Number.parseInt(process.env.FINAL_BLOCK_NUMBER)
  const blockCount = endBlockNumber - startBlockNumber
  const chunkCount = Math.ceil(blockCount / BLOCK_LIMIT_PER_CALL)

  // The ranges of block numbers to retrieve data for are set up in such a manner that they don't overlap.
  const ranges = [...Array(chunkCount).keys()].map((i) => [
    startBlockNumber + i * BLOCK_LIMIT_PER_CALL,
    startBlockNumber + (i + 1) * BLOCK_LIMIT_PER_CALL - 1,
  ])

  // Update last range to stop at indicated block number.
  ranges[ranges.length - 1][1] = endBlockNumber

  console.log(`Processing addresses: ${blockCount} blocks`)
  let index: Set<string> = new Set()
  for (const range of ranges) {
    const tokenTransfers = await tokenContract.queryFilter(
      transferEventsFilter,
      range[0],
      range[1]
    )
    const tokenReceivers = new Set(tokenTransfers.map((t: any) => t.args.to))
    index = new Set([...tokenReceivers, ...index])
    console.log(
      `${(100 - ((endBlockNumber - range[1]) / blockCount) * 100).toFixed(2)}%`
    )
  }

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
  const csvWriter = createArrayCsvWriter({
    header: ['Address', 'Balance'],
    path: 'balances.csv',
  })
  await csvWriter.writeRecords(Object.entries(balances))
  console.log('Done. View balance.csv.')
})()
