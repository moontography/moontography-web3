import assert from 'assert'
import { BigNumber } from 'bignumber.js'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import Web3 from 'web3'
import { provider, Account, Transaction } from 'web3-core'
import { BlockTransactionObject } from 'web3-eth'
import { Unit } from 'web3-utils'
import { IAddress } from './Address'
import { exponentialBackoff } from './Helpers'
import ERC20 from './web3/ERC20'
import IUniswapV3Factory from './web3/IUniswapV3Factory'

dayjs.extend(utc)

export default function Web3Utils(
  provider?: provider,
  httpProvUrl?: string,
  addressOpts?: IAddress
) {
  return {
    web3: new Web3(
      provider || new Web3.providers.HttpProvider(httpProvUrl || '')
    ),

    // https://github.com/ThatOtherZach/Web3-by-Example/blob/master/scripts/getBalance.js
    async getBalance(addr?: string, units: Unit = 'ether'): Promise<string> {
      if (!addr) {
        assert(
          addressOpts && addressOpts.address,
          'global address not provided'
        )
        addr = addressOpts.address
      }
      assert(addr, 'address must be provided')
      const result = await exponentialBackoff(
        async () => await this.web3.eth.getBalance(addr as string)
      )
      return this.web3.utils.fromWei(result, units)
    },

    async getTransactions(
      addr: string,
      startBlockNumber?: number,
      endBlockNumber?: number,
      progressCallback?: (block: number) => {}
    ): Promise<Transaction[]> {
      const caseInsensitiveAddy = addr.toLowerCase()
      if (typeof endBlockNumber !== 'number') {
        endBlockNumber = (await exponentialBackoff(
          async () => await this.web3.eth.getBlockNumber()
        )) as number
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
            const block: BlockTransactionObject = await exponentialBackoff(
              async () => await this.web3.eth.getBlock(i, true)
            )
            if (typeof progressCallback === 'function') progressCallback(i)
            if (block != null && block.transactions != null) {
              txns = txns.concat(
                block.transactions.filter(
                  (e) =>
                    caseInsensitiveAddy == '*' ||
                    caseInsensitiveAddy == (e.from || '').toLowerCase() ||
                    caseInsensitiveAddy == (e.to || '').toLowerCase()
                )
              )
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

      const dayjsDate = dayjs.utc(date).startOf('day')
      const currentBlockInfo = await exponentialBackoff(
        async () => await this.web3.eth.getBlock(currentBlock as number)
      )
      const currentBlockDate = dayjs.utc(
        Number(currentBlockInfo.timestamp) * 1000
      )
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
            const blockBeforeDate = dayjs.utc(
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
            const blockAfterDate = dayjs.utc(
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

export async function genericErc20Approval(
  web3: Web3,
  userAddy: string,
  spendAmount: number | string,
  tokenAddress: string,
  delegateAddress: string
) {
  if (new BigNumber(spendAmount || 0).lte(0)) return

  const contract = ERC20(web3, tokenAddress)
  const currentAllowance = await contract.methods
    .allowance(userAddy, delegateAddress)
    .call()
  if (new BigNumber(currentAllowance).lte(spendAmount || 0)) {
    const txn = contract.methods.approve(
      delegateAddress,
      new BigNumber(2).pow(256).minus(1).toFixed()
    )
    const gasLimit = await txn.estimateGas({
      from: userAddy,
    })
    await txn.send({
      from: userAddy,
      gasLimit: new BigNumber(gasLimit).times('1.6').toFixed(0),
    })
  }
}

export function addAllAccountsToWeb3(web3: Web3, pKeys: string[]): Account[] {
  let accounts: Account[] = []
  for (let _i = 0; _i < pKeys.length; _i++) {
    accounts.push(addAccountToWeb3(web3, pKeys[_i]))
  }
  return accounts
}

export function addAccountToWeb3(web3: Web3, pKey: string): Account {
  const account = web3.eth.accounts.privateKeyToAccount(`0x${pKey}`)
  web3.eth.accounts.wallet.add(account)
  return account
}

export function randomizeObjectKeys(obj: any, regexp: RegExp) {
  return Object.keys(obj)
    .filter((k) => regexp.test(k))
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
}

export async function getIdealV3TokenPoolFee(
  web3: Web3,
  factoryAddress: string,
  t0: string,
  t1: string
): Promise<number> {
  const fees: number[] = [100, 500, 3000, 10000]
  const factory = IUniswapV3Factory(web3, factoryAddress)
  const t0Cont = ERC20(web3, t0)
  const pools = await Promise.all([
    factory.methods.getPool(t0, t1, fees[0]).call(),
    factory.methods.getPool(t0, t1, fees[1]).call(),
    factory.methods.getPool(t0, t1, fees[2]).call(),
    factory.methods.getPool(t0, t1, fees[3]).call(),
  ])
  const filteredPools = pools
    .map((pool, idx) => ({ pool, idx }))
    .filter((p) => new BigNumber(p.pool.toLowerCase()).gt(0))
  if (filteredPools.length == 1) {
    return fees[filteredPools[0].idx]
  }

  const t0Balances = await Promise.all(
    filteredPools.map(async (info) => {
      return {
        ...info,
        balance: await t0Cont.methods.balanceOf(info.pool).call(),
      }
    })
  )
  const [desiredPool] = t0Balances.sort((i1, i2) =>
    new BigNumber(i2.balance).minus(i1.balance).toNumber()
  )
  return fees[desiredPool.idx]
}

export const uniswapV2Info: any = {
  bsc: {
    router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    wrappedNative: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    utils: Web3Utils(null, `https://bsc-dataseed.binance.org/`),
  },
  eth: {
    router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    wrappedNative: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    utils: Web3Utils(null, `https://rpc.mevblocker.io/norefunds`),
  },
}

export const uniswapV3Info: any = {
  // bsc: {
  //   factory: '',
  //   router: '',
  //   wrappedNative: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
  //   utils: Web3Utils(null, `https://bsc-dataseed.binance.org/`),
  // },
  eth: {
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    router: '0xe592427a0aece92de3edee1f18e0157c05861564',
    wrappedNative: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    utils: Web3Utils(null, `https://rpc.mevblocker.io/norefunds`),
  },
}

export interface IBlockRange {
  first: number
  last: number
}

type IBlockRangeDebugger = (which: string, block: number) => void
