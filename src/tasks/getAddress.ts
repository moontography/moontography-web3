import assert from 'assert'
import minimist from 'minimist'
import { getAddressFromInput } from '../libs/Address'

const argv = minimist(process.argv.slice(2), { string: ['k', 'key'] })
const key = argv.k || argv.key
;(async function getAddress() {
  try {
    assert(key, 'private key not provided')
    const { address, privKey, pubKey } = getAddressFromInput(key)
    console.log(
      JSON.stringify([
        {
          address,
          'private key': privKey,
          'public key': pubKey,
        },
      ])
    )
  } catch (err) {
    console.error(`Error getting address`, err)
  } finally {
    process.exit()
  }
})()
