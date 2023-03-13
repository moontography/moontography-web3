import assert from 'assert'
import dotenv from 'dotenv'
import { Wallet } from 'ethers'
// import fs from 'fs'
import minimist from 'minimist'

const argv = minimist(process.argv.slice(2))
const number = parseInt(argv.n || argv.number || 5)

dotenv.config()
;(async function getWallets() {
  try {
    const mnemonic = process.env.MNEMONIC
    assert(mnemonic, 'MNEMONIC is needed to get wallets')

    for (let i = 0; i < number; i++) {
      const { address, privateKey } = Wallet.fromMnemonic(
        mnemonic,
        `m/44'/60'/0'/0/${i}`
      )
      console.log('WALLET', i + 1, address, privateKey)
    }

    console.log(`Finished!`)
  } catch (err) {
    console.error(`Error getting wallets`, err)
  } finally {
    process.exit()
  }
})()
