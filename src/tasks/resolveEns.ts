// To use this script
// bash-cli$ PROVIDER_URL=MAINNET_RPC_URL node dist/tasks/resolveEns --name resolver.eth

import assert from 'assert'
import minimist from 'minimist'
import { ethers } from 'ethers'

const argv = minimist(process.argv.slice(2), { string: ['n', 'name'] })
const name = argv.n || argv.name || 'resolver.eth'
;(async function resolveEns() {
  try {
    assert(process.env.PROVIDER_URL, 'provider URL not provided')
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.PROVIDER_URL
    )
    console.log('ADDY', await provider.resolveName(name))
    process.exit(0)
  } catch (err) {
    console.error('Error resolving ENS name', err)
    process.exit(1)
  }
})()
