require('dotenv').config()

import assert from 'assert'
import BigNumber from 'bignumber.js'
import dayjs from 'dayjs'
import minimist from 'minimist'
import {
  addAllAccountsToWeb3,
  randomizeObjectKeys,
  uniswapV2Info,
} from '../libs/Web3Utils'
import UniswapV2Router02 from '../libs/web3/UniswapV2Router02'

const argv = minimist(process.argv.slice(2), {
  string: ['a', 'address', 'n', 'network', 't', 'token'],
})
const token = argv.t || argv.token
const network = argv.n || argv.network || 'eth'
const numWallets = argv.w || argv.wallets || 1
const balancePercentage = argv.p || argv.percentage || 75
const balanceMinETH = argv.m || argv.min || 0.2

;(async function buyBotV2() {
  try {
    assert(token, `Need token contract to try to buy`)

    const pkeyVarRegExp = /BUY_WALLET_PKEY_(\d+)/
    const allPkeys = randomizeObjectKeys(process.env, pkeyVarRegExp)

    const web3 = uniswapV2Info[network].utils.web3
    const router = UniswapV2Router02(web3, uniswapV2Info[network].router)
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
        const txn =
          router.methods.swapExactETHForTokensSupportingFeeOnTransferTokens(
            0, // NOTE: should use private RPC to prevent frontrunning
            [uniswapV2Info[network].wrappedNative, token],
            wallet,
            dayjs().add(5, 'minutes').unix()
          )
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
