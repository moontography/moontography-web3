import assert from 'assert'
import columnify from 'columnify'
import minimist from 'minimist'
import Rng from '../libs/Rng'
import Web3Utils from '../libs/Web3Utils'
import { getAddressFromPrivateKey } from '../libs/Address'

const argv = minimist(process.argv.slice(2))
const jsonRpc = argv.r || argv.rpc
const tries = argv.t || argv.tries || 1e2
;(async function findAccountsWithBalances() {
  try {
    assert(jsonRpc, 'JSON RPC for web3 not provided')
    assert(!isNaN(parseInt(tries)), 'tries is not a number')
    const iTries = parseInt(tries)
    const utils = Web3Utils(jsonRpc)

    let cols: any = []
    const attempts = new Array(iTries).fill(0)
    await Promise.all(
      attempts.map(async (_) => {
        try {
          process.stdout.write(`.`)
          const seed = Rng.random()
          const { address, privKey, pubKey } = getAddressFromPrivateKey(seed)
          const ether = await utils.getBalance(address)
          // if (isNaN(parseFloat(ether)) || parseFloat(ether) === 0) return

          cols.push({
            seed,
            address,
            privKey,
            // pubKey,
            ether,
          })
        } catch (err) {
          console.error(`Whoops`, err)
        }
      })
    )

    console.log(`\n${columnify(cols)}`)
  } catch (err) {
    console.error(`Error finding accounts`, err)
  } finally {
    process.exit()
  }
})()
