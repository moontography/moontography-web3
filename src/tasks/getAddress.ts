import assert from 'assert'
import columnify from 'columnify'
import minimist from 'minimist'
import { getAddressFromPrivateKey } from '../libs/Address'

const argv = minimist(process.argv.slice(2), { string: ['k', 'key'] })
const key = argv.k || argv.key
;(async function getAddress() {
  try {
    assert(key, 'private key not provided')
    const { address, privKey, pubKey } = getAddressFromPrivateKey(key)
    console.log(
      columnify([
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
