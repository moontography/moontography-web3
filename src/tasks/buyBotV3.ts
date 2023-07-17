require('dotenv').config()

import assert from 'assert'
import BigNumber from 'bignumber.js'
import dayjs from 'dayjs'
import minimist from 'minimist'
import {
  addAllAccountsToWeb3,
  getIdealV3TokenPoolFee,
  randomizeObjectKeys,
  uniswapV3Info,
} from '../libs/Web3Utils'
import SwapRouter from '../libs/web3/SwapRouter'

const argv = minimist(process.argv.slice(2), {
  string: ['a', 'address', 'n', 'network', 't', 'token'],
})
const token = argv.t || argv.token
// const network = argv.n || argv.network || 'eth'
const network = 'eth'
const numWallets = argv.w || argv.wallets || 1
const balancePercentage = argv.p || argv.percentage || 80
const balanceMinETH = argv.m || argv.min || 0.1

const info: any = uniswapV3Info

;(async function buyBotV3() {
  try {
    assert(token, `Need token contract to try to buy`)

    const pkeyVarRegExp = /BUY_WALLET_PKEY_(\d+)/
    const allPkeys = randomizeObjectKeys(process.env, pkeyVarRegExp)

    const web3 = info[network].utils.web3
    const router = SwapRouter(web3, info[network].router)
    const pkeys = new Array(numWallets)
      .fill(0)
      .map((_, idx) => process.env[allPkeys[idx]] || '')
      .filter((key: string) => !!key)
    const accounts = addAllAccountsToWeb3(web3, pkeys)

    async function buyAttemptAndRetryForever(pkeyIdx: number) {
      try {
        const wallet = accounts[pkeyIdx].address
        const balance = await web3.eth.getBalance(wallet)
        const balETH = new BigNumber(balance).div(new BigNumber(10).pow(18))
        if (balETH.lte(balanceMinETH)) {
          return console.log(
            'NOT BUYING BALANCE MIN',
            pkeyIdx,
            wallet,
            balETH.toFixed(6)
          )
        }
        const exactValueToBuy = new BigNumber(balance)
          .times(balancePercentage)
          .div(100)
        const valueToBuy = exactValueToBuy
          .minus(
            new BigNumber(exactValueToBuy).times('0.03').times(Math.random())
          )
          .toFixed(0)
        const poolFee = await getIdealV3TokenPoolFee(
          web3,
          info[network].factory,
          info[network].wrappedNative,
          token
        )
        const txn = router.methods.exactInputSingle([
          info[network].wrappedNative,
          token,
          poolFee,
          wallet,
          `${dayjs().add(5, 'minutes').unix()}`,
          valueToBuy,
          '0', // NOTE: should use private RPC to prevent frontrunning
          '0', // NOTE: should use private RPC to prevent frontrunning
        ])
        console.log(
          'BUYING NOW',
          pkeyIdx,
          wallet,
          new BigNumber(balance).div(new BigNumber(10).pow(18)).toFixed(),
          new BigNumber(valueToBuy).div(new BigNumber(10).pow(18)).toFixed()
        )
        const gasLimit = await txn.estimateGas({
          from: wallet,
          value: valueToBuy,
        })
        await txn.send({
          from: wallet,
          value: valueToBuy,
          gasLimit: new BigNumber(gasLimit).times('1.3').toFixed(0),
        })
        console.log(
          'SUCCESS',
          pkeyIdx,
          wallet,
          new BigNumber(balance).div(new BigNumber(10).pow(18)).toFixed(),
          new BigNumber(valueToBuy).div(new BigNumber(10).pow(18)).toFixed()
        )
      } catch (err) {
        console.error(`Issue buying, trying again`, err)
        await buyAttemptAndRetryForever(pkeyIdx)
      }
    }

    await Promise.all(
      pkeys.map(async (_, idx) => {
        await buyAttemptAndRetryForever(idx)
      })
    )

    console.log('Succuessfully finished buying')
  } catch (err) {
    console.error(`Error processing`, err)
  } finally {
    process.exit()
  }
})()
