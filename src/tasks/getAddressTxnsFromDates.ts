import assert from 'assert'
import minimist from 'minimist'
import Web3Utils from '../libs/Web3Utils'

const argv = minimist(process.argv.slice(2), { string: ['a', 'address'] })
const jsonRpc = argv.r || argv.rpc || 'http://localhost:8545'
const start = argv.s || argv.start
const end = argv.e || argv.end
const addy = argv.a || argv.address
;(async function getAddressTxnsFromDates() {
  try {
    assert(jsonRpc, 'JSON RPC for web3 not provided')
    assert(start && end, 'start and end dates are not provided')
    assert(addy, 'address not provided')

    const utils = Web3Utils(null, jsonRpc)
    const { first, last } = await utils.getBlocksOverDateRange(start, end, () =>
      process.stdout.write('.')
    )
    console.log(`\nnow getting transactions -- start ${first} end ${last}`)
    const txns = await utils.getTransactions(addy, first, last, () =>
      process.stdout.write('.')
    )
    console.log('\n\ntransactions', txns)
  } catch (err) {
    console.error(`Error getting blocks`, err)
  } finally {
    process.exit()
  }
})()
