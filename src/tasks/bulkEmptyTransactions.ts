// To use this script
// bash-cli$ PROVIDER_URL=INFURA_URL PRIVATE_KEY=THE_KEY NUMBER=NUMBER_OF_TXNS_TO_RUN_THROUGH node dist/tasks/bulkEmptyTransactions

import assert from 'assert'
import BigNumber from 'bignumber.js'
import Web3 from 'web3'

async function bulkEmptyTransactions() {
  assert(process.env.PROVIDER_URL, 'provider URL not provided')
  assert(process.env.NUMBER, 'nonce not provided')
  const web3 = new Web3(
    new Web3.providers.HttpProvider(process.env.PROVIDER_URL)
  )
  const account = web3.eth.accounts.privateKeyToAccount(
    `0x${process.env.PRIVATE_KEY}`
  )
  const firstNonce = await web3.eth.getTransactionCount(account.address)
  let transactions = []
  for (let i = 0; i < Number(process.env.NUMBER); i++) {
    const nonce = new BigNumber(firstNonce).plus(i).toNumber()
    const txData = {
      from: account.address,
      to: account.address,
      value: '0',
      nonce,

      // if you see a "Error: Returned error: exceeds block gas limit" error, hardcode a
      // gas value as commented below which should force it through
      // https://ethereum.stackexchange.com/questions/1832/cant-send-transaction-exceeds-block-gas-limit-or-intrinsic-gas-too-low
      // gas: await web3.eth.getGasPrice(),
      gas: 1000000,
      gasPrice: new BigNumber(await web3.eth.getGasPrice())
        .times('2')
        .toFixed(0), // 2x current gas price
    }
    const signedTx = await account.signTransaction(txData)
    assert(signedTx.rawTransaction, 'raw transaction not found')
    transactions.push(web3.eth.sendSignedTransaction(signedTx.rawTransaction))
  }
  await Promise.all(
    transactions.map(async (txn, ind) => {
      console.log(`result for txn ${ind + 1}`, await txn)
    })
  )
}

;(async function execute() {
  try {
    await bulkEmptyTransactions()
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
})()
