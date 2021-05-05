import assert from 'assert'
import columnify from 'columnify'
import minimist from 'minimist'
import Web3Utils from '../libs/Web3Utils'

const argv = minimist(process.argv.slice(2), {
  string: ['a', 'addr', 'address'],
})
const addr = argv.a || argv.addr || argv.address
const jsonRpc = argv.r || argv.rpc || 'http://localhost:8545'
const startBlock = argv.s || argv.start
const endBlock = argv.e || argv.end
;(async function getTransactions() {
  try {
    assert(jsonRpc, 'JSON RPC for web3 not provided')
    assert(addr, 'address not provided')
    assert(
      typeof startBlock === 'undefined' || !isNaN(parseInt(startBlock)),
      'start block provided is not a number'
    )
    assert(
      typeof endBlock === 'undefined' || !isNaN(parseInt(endBlock)),
      'end block provided is not a number'
    )
    const utils = Web3Utils(jsonRpc)
    const txns = await utils.getTransactions(
      addr,
      startBlock && parseInt(startBlock),
      endBlock || parseInt(endBlock),
      () => process.stdout.write('.')
    )
    console.log(`\nAddress ${addr}'s transactions`, txns)
  } catch (err) {
    console.error(`Error getting address`, err)
  } finally {
    process.exit()
  }
})()
