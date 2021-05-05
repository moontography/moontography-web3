import assert from 'assert'
import dayjs from 'dayjs'
import Web3 from 'web3'
import { Transaction } from 'web3-core'
import { Unit } from 'web3-utils'
import { IAddress } from './Address'
import { exponentialBackoff } from './Helpers'

export default function Web3Utils(httpProvUrl: string, opts?: IAddress) {
  return {
    web3: new Web3(new Web3.providers.HttpProvider(httpProvUrl)),

    // https://github.com/ThatOtherZach/Web3-by-Example/blob/master/scripts/getBalance.js
    async getBalance(
      addr: undefined | string,
      units: Unit = 'ether'
    ): Promise<string> {
      if (!addr) {
        assert(opts?.address, 'global address not provided')
        addr = opts.address
      }
      assert(addr, 'address must be provided')
      const result = await this.web3.eth.getBalance(addr)
      return this.web3.utils.fromWei(result, units)
    },

    async getTransactions(
      addr: string,
      startBlockNumber?: number,
      endBlockNumber?: number,
      progressCallback?: (block: number) => {}
    ): Promise<Transaction[]> {
      if (typeof endBlockNumber !== 'number') {
        endBlockNumber = await this.web3.eth.getBlockNumber()
      }
      if (typeof startBlockNumber !== 'number') {
        assert(
          typeof endBlockNumber === 'number',
          'end block number is not provided in addition to startBlockNumber'
        )
        startBlockNumber = endBlockNumber - 1000
      }

      let txns: Transaction[] = []
      await Promise.all(
        new Array(endBlockNumber - startBlockNumber)
          .fill(0)
          .map(async (_, index) => {
            const i = (startBlockNumber || 0) + index
            const block = await exponentialBackoff(
              async () => await this.web3.eth.getBlock(i, true)
            )
            if (typeof progressCallback === 'function') progressCallback(i)
            if (block != null && block.transactions != null) {
              block.transactions.forEach((e: any) => {
                if (addr == '*' || addr == e.from || addr == e.to) {
                  txns.push(e)
                }
              })
            }
          })
      )

      return txns
    },

    /**
     * getBlocksOverDateRange
     * Binary searches over blocks to get a range of blocks that were created over
     * a date range provided.
     * @param startDate
     * @param endDate
     */
    async getBlocksOverDateRange(
      startDate: Date | string,
      endDate: Date | string,
      debugFunction?: IBlockRangeDebugger
    ): Promise<IBlockRange> {
      const [first, last] = await Promise.all([
        this.getBlockOnDate(startDate, 'first', undefined, debugFunction),
        this.getBlockOnDate(endDate, 'last', undefined, debugFunction),
      ])
      return { first, last }
    },

    async getBlockOnDate(
      date: Date | string,
      which: 'first' | 'last' = 'first',
      currentBlock?: number,
      debugFunction?: IBlockRangeDebugger,
      firstBlock?: number,
      lastBlock?: number
    ): Promise<number> {
      firstBlock = typeof firstBlock === 'number' ? firstBlock : 0
      lastBlock =
        typeof lastBlock === 'number'
          ? lastBlock
          : await this.web3.eth.getBlockNumber()
      currentBlock = typeof currentBlock === 'number' ? currentBlock : lastBlock

      const dayjsDate = dayjs(date).startOf('day')
      const currentBlockInfo = await exponentialBackoff(
        async () => await this.web3.eth.getBlock(currentBlock as number)
      )
      const currentBlockDate = dayjs(Number(currentBlockInfo.timestamp) * 1000)
      if (currentBlockDate.startOf('day').isBefore(dayjsDate)) {
        if (currentBlock > lastBlock) return lastBlock

        const updatedBlock =
          lastBlock - Math.ceil((lastBlock - currentBlock) / 2)
        if (debugFunction) debugFunction(which, updatedBlock)
        return await this.getBlockOnDate(
          date,
          which,
          updatedBlock,
          debugFunction,
          currentBlock,
          lastBlock
        )
      }

      if (currentBlockDate.startOf('day').isAfter(dayjsDate)) {
        if (currentBlock <= firstBlock) return firstBlock

        const updatedBlock = Math.floor(currentBlock / 2)
        if (debugFunction) debugFunction(which, updatedBlock)
        return await this.getBlockOnDate(
          date,
          which,
          updatedBlock,
          debugFunction,
          firstBlock,
          currentBlock
        )
      }

      // if we get here it means we're on the day we want
      let blockChange = 40
      while (true) {
        switch (which) {
          case 'first': {
            const blockBefore = Math.max(0, currentBlock - blockChange)
            if (blockBefore === 0) return blockBefore
            const blockBeforeInfo = await exponentialBackoff(
              async () => await this.web3.eth.getBlock(blockBefore as number)
            )
            const blockBeforeDate = dayjs(
              Number(blockBeforeInfo.timestamp) * 1000
            )
            if (blockBeforeDate.startOf('day').isSame(dayjsDate)) {
              if (debugFunction) debugFunction(which, blockBefore)
              currentBlock = blockBefore
              continue
            } else if (blockChange > 1) {
              blockChange = Math.floor(blockChange / 2)
              continue
            }
            return currentBlock
          }
          // 'last'
          default: {
            const blockAfter = Math.min(currentBlock + blockChange, lastBlock)
            if (blockAfter === lastBlock) return lastBlock
            const blockAfterInfo = await exponentialBackoff(
              async () => await this.web3.eth.getBlock(blockAfter as number)
            )
            const blockAfterDate = dayjs(
              Number(blockAfterInfo.timestamp) * 1000
            )
            if (
              blockAfterDate.startOf('day').isSame(dayjsDate.startOf('day'))
            ) {
              if (debugFunction) debugFunction(which, blockAfter)
              currentBlock = blockAfter
              continue
            } else if (blockChange > 1) {
              blockChange = Math.floor(blockChange / 2)
              continue
            }
            return currentBlock
          }
        }
      }
    },
  }
}

export interface IBlockRange {
  first: number
  last: number
}

type IBlockRangeDebugger = (which: string, block: number) => void
