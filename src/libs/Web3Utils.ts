import assert from 'assert'
import Web3 from 'web3'
import { Transaction } from 'web3-core'
import { Unit } from 'web3-utils'
import { IAddress } from './Address'

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
      if (!endBlockNumber) {
        endBlockNumber = await this.web3.eth.getBlockNumber()
      }
      if (!startBlockNumber) {
        assert(
          endBlockNumber,
          'end block number is not provided in addition to startBlockNumber'
        )
        startBlockNumber = endBlockNumber - 1000
      }

      let txns: Transaction[] = []
      for (var i = startBlockNumber; i <= endBlockNumber; i++) {
        if (typeof progressCallback === 'function') progressCallback(i)
        const block = await this.web3.eth.getBlock(i, true)
        if (block != null && block.transactions != null) {
          block.transactions.forEach((e) => {
            if (addr == '*' || addr == e.from || addr == e.to) {
              txns.push(e)
            }
          })
        }
      }

      return txns
    },
  }
}
