import assert from 'assert'
import minimist from 'minimist'
import Web3Utils from '../libs/Web3Utils'
import UniswapV2Router02 from '../libs/web3/UniswapV2Router02'

const argv = minimist(process.argv.slice(2), { string: ['a', 'address'] })
const jsonRpc = argv.r || argv.rpc || 'http://localhost:8545'
const addy = argv.a || argv.address
;(async function buyInBulkUniswap() {
  try {
    assert(jsonRpc, 'JSON RPC for web3 not provided')
    const utils = Web3Utils(null, jsonRpc)
    const router = UniswapV2Router02(
      utils.web3,
      '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
    )

    // console.log('\n\ntransactions', txns)
  } catch (err) {
    console.error(`Error processing buys`, err)
  } finally {
    process.exit()
  }
})()
