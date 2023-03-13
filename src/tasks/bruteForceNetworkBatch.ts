import assert from 'assert'
import fs from 'fs'
import path from 'path'
import BigNumber from 'bignumber.js'
import minimist from 'minimist'
import Random from '../libs/Random'
import Web3Utils from '../libs/Web3Utils'
import { getAddressFromInput } from '../libs/Address'

const argv = minimist(process.argv.slice(2))
const initSeed = argv.s || argv.seed
const jsonRpc = argv.r || argv.rpc || 'http://localhost:8545'
const tries = argv.t || argv.tries || 1e10
const batch = argv.b || argv.batch || 1e3
;(async function bruteForceNetworkBatch() {
  const fileStream = fs.createWriteStream(
    path.join(`./addresses_${Date.now()}.json`)
  )
  try {
    assert(jsonRpc, 'JSON RPC for web3 not provided')
    assert(!isNaN(parseInt(tries)), 'tries is not a number')
    assert(!isNaN(parseInt(batch)), 'batch is not a number')
    const iBatch = parseInt(batch)
    const iTries = parseInt(tries)
    const utils = Web3Utils(null, jsonRpc)

    let cols: any = []
    let numProcessed = 0
    while (numProcessed < iTries) {
      process.stdout.write(`*`)
      const attempts = new Array(Math.min(iBatch, iTries)).fill(0)
      await Promise.all(
        attempts.map(async (_, i) => {
          try {
            if (i % (batch / 5) == 0) {
              process.stdout.write(`.`)
            }
            numProcessed++
            // if (i % 200 === 0) process.stdout.write(`\n`)
            const seed = initSeed || (await Random.bytes())
            const { address, privKey, pubKey } = getAddressFromInput(seed)
            const ether = new BigNumber(await utils.getBalance(address))

            const addy = {
              // seed,
              address,
              privKey,
              // pubKey,
              ether,
            }
            fileStream.write(`${JSON.stringify(addy)}\n`, 'utf-8')
            if (ether.lte(0)) {
              // console.log(`No bueno :(`, JSON.stringify(addy))
            } else {
              console.log(`Found one`, JSON.stringify(addy))
              cols.push(addy)
            }
          } catch (err) {
            console.error(`Whoops`, err)
          }
        })
      )
    }

    console.log(`\n${JSON.stringify(cols)}`)
  } catch (err) {
    console.error(`Error finding accounts`, err)
  } finally {
    fileStream.end()
    process.exit()
  }
})()
