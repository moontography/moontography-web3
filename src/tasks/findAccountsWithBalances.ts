import assert from 'assert'
import columnify from 'columnify'
import minimist from 'minimist'
import Random from '../libs/Random'
import Web3Utils from '../libs/Web3Utils'
import { getAddressFromInput } from '../libs/Address'

const argv = minimist(process.argv.slice(2))
const initSeed = argv.s || argv.see
const jsonRpc = argv.r || argv.rpc || 'http://localhost:8545'
const tries = argv.t || argv.tries || 1e4
const batch = argv.b || argv.batch || 1e3
;(async function findAccountsWithBalances() {
  try {
    assert(jsonRpc, 'JSON RPC for web3 not provided')
    assert(!isNaN(parseInt(tries)), 'tries is not a number')
    assert(!isNaN(parseInt(batch)), 'batch is not a number')
    const iBatch = parseInt(batch)
    const iTries = parseInt(tries)
    const utils = Web3Utils(jsonRpc)

    let cols: any = []
    let numProcessed = 0
    while (numProcessed < iTries) {
      process.stdout.write(`*`)
      const attempts = new Array(Math.min(iBatch, iTries)).fill(0)
      await Promise.all(
        attempts.map(async (_) => {
          try {
            process.stdout.write(`.`)
            numProcessed++
            const seed = initSeed || (await Random.bytes())
            const { address, privKey, pubKey } = getAddressFromInput(seed)
            const ether = await utils.getBalance(address)
            if (isNaN(parseFloat(ether)) || parseFloat(ether) === 0) return

            const addy = {
              seed,
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
        })
      )
    }

    console.log(`\n${columnify(cols)}`)
  } catch (err) {
    console.error(`Error finding accounts`, err)
  } finally {
    process.exit()
  }
})()
