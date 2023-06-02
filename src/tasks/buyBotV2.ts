require('dotenv').config()

import assert from 'assert'
import BigNumber from 'bignumber.js'
import dayjs from 'dayjs'
import minimist from 'minimist'
import Web3Utils, { addAllAccountsToWeb3 } from '../libs/Web3Utils'
import UniswapV2Router02 from '../libs/web3/UniswapV2Router02'

const argv = minimist(process.argv.slice(2), {
  string: ['a', 'address', 'n', 'network', 't', 'token'],
})
const token = argv.t || argv.token
const network = argv.n || argv.network || 'eth'
const numWallets = argv.w || argv.wallets || 1
const balancePercentage = argv.p || argv.percentage || 40

const info: any = {
  bsc: {
    router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    wrappedNative: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    utils: Web3Utils(null, `https://bsc-dataseed.binance.org/`),
  },
  eth: {
    router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    wrappedNative: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    utils: Web3Utils(null, `https://rpc.mevblocker.io/norefunds`),
  },
}

;(async function buyBotV2() {
  try {
    assert(token, `Need token contract to try to buy`)

    const web3 = info[network].utils.web3
    const router = UniswapV2Router02(web3, info[network].router)
    const pkeys = new Array(numWallets)
      .fill(0)
      .map((_, idx) => process.env[`BUY_WALLET_PKEY_${idx + 1}`] || '')
      .filter((wallet: string) => !!wallet)
    const accounts = addAllAccountsToWeb3(web3, pkeys)

    async function buyAttemptAndRetryForever(pkeyIdx: number) {
      try {
        const wallet = accounts[pkeyIdx].address
        const balance = await web3.eth.getBalance(wallet)
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
            [info[network].wrappedNative, token],
            wallet,
            dayjs().add(1, 'hours').unix()
          )
        console.log(
          'BUYING NOW',
          pkeyIdx,
          wallet,
          new BigNumber(balance).div(new BigNumber(10).pow(18)).toFixed(),
          new BigNumber(valueToBuy).div(new BigNumber(10).pow(18)).toFixed(),
          token
        )
        const gasLimit = await txn.estimateGas({
          from: wallet,
          value: valueToBuy,
        })
        await txn.send({
          from: wallet,
          value: valueToBuy,
          gasLimit: new BigNumber(gasLimit).times('1.6').toFixed(0),
        })
        console.log(
          'SUCCESS',
          pkeyIdx,
          wallet,
          new BigNumber(balance).div(new BigNumber(10).pow(18)).toFixed(),
          new BigNumber(valueToBuy).div(new BigNumber(10).pow(18)).toFixed(),
          token
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

    console.log('Succuessfully finished buying', token)
  } catch (err) {
    console.error(`Error processing`, err)
  } finally {
    process.exit()
  }
})()
