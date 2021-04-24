import assert from 'assert'
import columnify from 'columnify'
import minimist from 'minimist'
import Web3Utils from '../libs/Web3Utils'

const argv = minimist(process.argv.slice(2), {
  string: ['a', 'addr', 'address'],
})
const addr = argv.a || argv.addr || argv.address
const jsonRpc = argv.r || argv.rpc || 'http://localhost:8545'
;(async function getTransactions() {
  try {
    assert(jsonRpc, 'JSON RPC for web3 not provided')
    assert(addr, 'address not provided')
    const utils = Web3Utils(jsonRpc)
    await utils.getTransactions(addr)
  } catch (err) {
    console.error(`Error getting address`, err)
  } finally {
    process.exit()
  }
})()
