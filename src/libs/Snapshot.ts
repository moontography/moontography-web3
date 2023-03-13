import { ethers, providers } from 'ethers'

export async function getAddressesWithTokenTransfers(
  provider: providers.BaseProvider,
  token: string,
  initialBlock: number | string,
  finalBlock: number | string,
  batchSize: number = 2000,
  processingFunction?: any
): Promise<[ethers.Contract, Set<string>]> {
  const tokenContract = new ethers.Contract(token, tokenABI, provider)
  const transferEventsFilter = tokenContract.filters.Transfer()

  // Most APIs limit event response data to 2,000 blocks. Hence we split the block range into manageable chunks. Set
  // accordingly to the provider's limits.
  const startBlockNumber = Number.parseInt(initialBlock.toString())
  const endBlockNumber = Number.parseInt(finalBlock.toString())
  const blockCount = endBlockNumber - startBlockNumber
  const chunkCount = Math.ceil(blockCount / batchSize)

  // The ranges of block numbers to retrieve data for are set up in such a manner that they don't overlap.
  const ranges = [...Array(chunkCount).keys()].map((i) => [
    startBlockNumber + i * batchSize,
    startBlockNumber + (i + 1) * batchSize - 1,
  ])

  // Update last range to stop at indicated block number.
  ranges[ranges.length - 1][1] = endBlockNumber

  let index: Set<string> = new Set()
  for (const range of ranges) {
    const tokenTransfers = await tokenContract.queryFilter(
      transferEventsFilter,
      range[0],
      range[1]
    )
    const tokenReceivers = new Set(tokenTransfers.map((t: any) => t.args.to))
    index = new Set([...tokenReceivers, ...index])
    if (typeof processingFunction === 'function') {
      processingFunction(
        `${(100 - ((endBlockNumber - range[1]) / blockCount) * 100).toFixed(
          2
        )}%`
      )
    }
  }
  return [tokenContract, index]
}

// This is a very small subset of the token contract's ABI. Specifically it only contains necessary parts of the
// contract to obtain the unique holder addresses and their token balance.
const tokenABI = [
  'function balanceOf(address user) external view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]
