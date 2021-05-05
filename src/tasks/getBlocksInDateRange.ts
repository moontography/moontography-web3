import assert from 'assert'
import dayjs from 'dayjs'
import minimist from 'minimist'
import Web3Utils from '../libs/Web3Utils'

const argv = minimist(process.argv.slice(2), { string: ['k', 'key'] })
const jsonRpc = argv.r || argv.rpc || 'http://localhost:8545'
const start = argv.s || argv.start
const end = argv.e || argv.end
;(async function getBlocksInDateRange() {
  try {
    assert(jsonRpc, 'JSON RPC for web3 not provided')
    assert(start && end, 'start and end dates are not provided')

    const utils = Web3Utils(jsonRpc)
    const { first, last } = await utils.getBlocksOverDateRange(start, end, () =>
      process.stdout.write('.')
    )
    console.log(
      `\n\nStart block is ${first} (${dayjs(
        Number((await utils.web3.eth.getBlock(first)).timestamp) * 1000
      ).format()}) and end block is ${last} (${dayjs(
        Number((await utils.web3.eth.getBlock(last)).timestamp) * 1000
      ).format()})`
    )
  } catch (err) {
    console.error(`Error getting blocks`, err)
  } finally {
    process.exit()
  }
})()
