// To use this script
// bash-cli$ DATA="the data" node dist/tasks/utf8ToHex

import assert from 'assert'
import Web3 from 'web3'
;(async function utf8ToHex() {
  try {
    assert(process.env.DATA, 'provider DATA not provided')
    console.log(Web3.utils.utf8ToHex(process.env.DATA))
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
})()
