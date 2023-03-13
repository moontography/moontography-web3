import assert from 'assert'
import Web3 from 'web3'
import { createArrayCsvWriter } from 'csv-writer'
import ERC721 from '../libs/web3/ERC721'
;(async function execute() {
  try {
    await erc721Snapshot()
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
})()

async function erc721Snapshot() {
  assert(process.env.PROVIDER_URL, 'provider URL not provided')
  assert(process.env.CONTRACT_ADDRESS, 'NFT contract not provided')
  const web3 = new Web3(
    new Web3.providers.HttpProvider(process.env.PROVIDER_URL)
  )
  const nft = ERC721(web3, process.env.CONTRACT_ADDRESS)
  const totalSupply = await nft.methods.totalSupply().call()

  const owners: any = {}
  for (let _i = 0; _i < totalSupply; _i++) {
    process.stdout.write(`.`)
    const tokenId = _i + 1
    owners[tokenId] = await nft.methods.ownerOf(tokenId).call()
  }
  process.stdout.write(`\n`)

  // Output CSV
  const csvWriter = createArrayCsvWriter({
    header: ['TokenID', 'Owner'],
    path: 'nftOwnership.csv',
  })
  await csvWriter.writeRecords(Object.entries(owners))

  console.log(`Successfully got snapshot. nftOwnership.csv`)
}
