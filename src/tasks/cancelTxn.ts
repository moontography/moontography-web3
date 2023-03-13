// To use this script
// bash-cli$ PROVIDER_URL=INFURA_URL PRIVATE_KEY=THE_KEY NONCE=THE_NONCE_OF_TXN_TO_CANCEL node dist/tasks/cancelTxn

import assert from 'assert'
import BigNumber from 'bignumber.js'
import Web3 from 'web3'

async function cancelTxn() {
  assert(process.env.PROVIDER_URL, 'provider URL not provided')
  assert(process.env.NONCE, 'nonce not provided')
  const web3 = new Web3(
    new Web3.providers.HttpProvider(process.env.PROVIDER_URL)
  )
  const account = web3.eth.accounts.privateKeyToAccount(
    `0x${process.env.PRIVATE_KEY}`
  )
  const txData = {
    from: account.address,
    to: account.address,
    value: '0',
    nonce: Number(process.env.NONCE),

    // if you see a "Error: Returned error: exceeds block gas limit" error, hardcode a
    // gas value as commented below which should force it through
    // https://ethereum.stackexchange.com/questions/1832/cant-send-transaction-exceeds-block-gas-limit-or-intrinsic-gas-too-low
    // gas: await web3.eth.getGasPrice(),
    gas: 100000,
    gasPrice: new BigNumber(await web3.eth.getGasPrice()).times('3').toFixed(0), // 3x current gas price
  }
  const signedTx = await account.signTransaction(txData)
  assert(signedTx.rawTransaction, 'raw transaction not found')
  const result = await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
  console.log(`Successfully executed txn:`, result)
}

;(async function execute() {
  try {
    await cancelTxn()
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
})()
