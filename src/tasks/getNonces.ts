// To use this script
// bash-cli$ ADDRESS=ADDRESS node dist/tasks/getNonces

import assert from 'assert'
import Web3 from 'web3'

async function getNonces() {
  const address = process.env.ADDRESS
  assert(address, 'address not provided')
  const networks = [
    { name: 'ETH', rpc: 'https://eth.llamarpc.com' },
    { name: 'BSC', rpc: 'https://bsc-dataseed.binance.org/' },
    { name: 'AVAX', rpc: 'https://api.avax.network/ext/bc/C/rpc' },
    { name: 'FTM', rpc: 'https://rpc.ftm.tools/' },
    {
      name: 'MATIC',
      rpc: 'https://endpoints.omniatech.io/v1/matic/mainnet/public',
    },
    { name: 'ARB', rpc: 'https://arbitrum-one.public.blastapi.io' },
  ]
  await Promise.all(
    networks.map(async ({ name, rpc }) => {
      const web3 = new Web3(new Web3.providers.HttpProvider(rpc))
      console.log(
        `Network: ${name} (${rpc}) - Nonce: ${await web3.eth.getTransactionCount(
          address
        )}`
      )
    })
  )
}

;(async function execute() {
  try {
    await getNonces()
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
})()
