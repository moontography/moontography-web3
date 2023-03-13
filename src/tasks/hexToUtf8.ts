// To use this script
// bash-cli$ DATA=0x6f6d6720736972 node dist/tasks/hexToUtf8

import assert from 'assert'
import Web3 from 'web3'
;(async function hexToUtf8() {
  try {
    assert(process.env.DATA, 'provider DATA not provided')
    console.log(Web3.utils.hexToUtf8(process.env.DATA))
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
})()
