import assert from 'assert'
import minimist from 'minimist'
import Web3Utils from '../libs/Web3Utils'

const argv = minimist(process.argv.slice(2), {
  string: ['a', 'addr', 'address'],
})
const jsonRpc = argv.r || argv.rpc
const addr = argv.a || argv.addr || argv.address
;(async function getBalance() {
  try {
    assert(jsonRpc, 'JSON RPC for web3 not provided')
    assert(addr, 'address not provided')
    const utils = Web3Utils(jsonRpc)
    const ether = await utils.getBalance(addr)
    console.log(`Account balance of ${addr} is ${ether} ETH`)
  } catch (err) {
    console.error(`Error getting address`, err)
  } finally {
    process.exit()
  }
})()
