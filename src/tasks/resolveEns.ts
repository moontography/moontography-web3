import { ENS } from '@ensdomains/ensjs'
import { ethers } from 'ethers'
;(async function resolveEns() {
  const provider = new ethers.providers.JsonRpcProvider(
    `https://mainnet.infura.io/v3/0a6f34747b834f738bbd72f5b534a789`
  )
  console.log('HERE1')
  const ens = new ENS()
  console.log('HERE2')
  await ens.setProvider(provider)
  console.log('HERE3')
  console.log('ADDY', await ens.name('resolver.eth').getAddress())
  console.log('HERE4')
})()
