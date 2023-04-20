// To use this script
// bash-cli$ FILE="pwd" node dist/tasks/utf8ToHexFile

import assert from 'assert'
import fs from 'fs/promises'
import Web3 from 'web3'
;(async function utf8ToHex() {
  try {
    assert(process.env.FILE, 'provider DATA not provided')
    const fileData = await fs.readFile(process.env.FILE, 'utf-8')
    console.log(Web3.utils.utf8ToHex(fileData))
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
})()
