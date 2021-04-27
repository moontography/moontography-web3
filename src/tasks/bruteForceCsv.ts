import assert from 'assert'
import fs from 'fs'
import columnify from 'columnify'
import minimist from 'minimist'
import Random from '../libs/Random'
import Web3Utils from '../libs/Web3Utils'
import { getAddressFromInput } from '../libs/Address'

const argv = minimist(process.argv.slice(2))
const initSeed = argv.s || argv.seed
const jsonRpc = argv.r || argv.rpc || 'http://localhost:8545'
const tries = argv.t || argv.tries || 1e10
const csvPath = argv.f || argv.file || argv.csv
;(async function bruteForceCsv() {
  try {
    assert(jsonRpc, 'JSON RPC for web3 not provided')
    assert(!isNaN(parseInt(tries)), 'tries is not a number')
    const iTries = parseInt(tries)
    const utils = Web3Utils(jsonRpc)
    const csvData = await fs.promises.readFile(csvPath, 'utf-8')
    const addresses: any = csvData
      .split('\n')
      .reduce((obj, addr) => ({ ...obj, [addr]: true }), {})

    let cols: any = []
    let numProcessed = 0
    while (numProcessed < iTries) {
      try {
        process.stdout.write(`.`)
        if (numProcessed % 200 === 0) process.stdout.write(`\n`)
        numProcessed++
        const seed = initSeed || (await Random.bytes())
        const { address, privKey, pubKey } = getAddressFromInput(seed)
        assert(address, 'address was found for private key')
        if (!addresses[address]) return

        const ether = await utils.getBalance(address)
        const addy = {
          // seed,
          address,
          privKey,
          // pubKey,
          ether,
        }
        console.log(`Found one`, JSON.stringify(addy))
        cols.push(addy)
        process.stdout.write(`.`)
      } catch (err) {
        console.error(`Whoops`, err)
      }
    }

    console.log(`\n${columnify(cols)}`)
  } catch (err) {
    console.error(`Error finding accounts`, err)
  } finally {
    process.exit()
  }
})()
