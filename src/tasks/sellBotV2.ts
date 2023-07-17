require('dotenv').config()

import assert from 'assert'
import BigNumber from 'bignumber.js'
import dayjs from 'dayjs'
import minimist from 'minimist'
// import { sleep } from '../libs/Helpers'
import {
  addAllAccountsToWeb3,
  genericErc20Approval,
  randomizeObjectKeys,
  uniswapV2Info,
} from '../libs/Web3Utils'
import UniswapV2Router02 from '../libs/web3/UniswapV2Router02'
import ERC20 from '../libs/web3/ERC20'

const argv = minimist(process.argv.slice(2), {
  string: ['a', 'address', 'n', 'network', 't', 'token'],
})
const token = argv.t || argv.token
const network = argv.n || argv.network || 'eth'
const numWallets = argv.w || argv.wallets || 1
const approveOnly = argv.a || argv.approve

;(async function sellBotV2() {
  try {
    assert(token, `Need token contract to try to sell`)

    const pkeyVarRegExp = /BUY_WALLET_PKEY_(\d+)/
    const allPkeys = randomizeObjectKeys(process.env, pkeyVarRegExp)

    const web3 = uniswapV2Info[network].utils.web3
    const router = UniswapV2Router02(web3, uniswapV2Info[network].router)
    const pkeysWithBalances = await Promise.all(
      new Array(allPkeys.length).fill(0).map(async (_, idx) => {
        const key = process.env[allPkeys[idx]]
        if (!key) {
          return ''
        }
        const account = web3.eth.accounts.privateKeyToAccount(`0x${key}`)
        const wallet = account.address
        const tokenBalance = await ERC20(web3, token)
          .methods.balanceOf(wallet)
          .call()
        if (new BigNumber(tokenBalance).lte(0)) {
          return ''
        }
        return key
      })
    )
    const pkeys = pkeysWithBalances
      .filter((key: string) => !!key)
      .slice(0, numWallets)
    const accounts = addAllAccountsToWeb3(web3, pkeys)

    async function sellAttemptAndRetryForever(pkeyIdx: number) {
      try {
        const wallet = accounts[pkeyIdx].address
        const tokenBalance = await ERC20(web3, token)
          .methods.balanceOf(wallet)
          .call()
        if (new BigNumber(tokenBalance).lte(0)) {
          return console.log(`not selling since no balance`, pkeyIdx, wallet)
        }

        await genericErc20Approval(
          web3,
          wallet,
          tokenBalance,
          token,
          uniswapV2Info[network].router
        )
        console.log(
          'APPROVED',
          pkeyIdx,
          wallet,
          new BigNumber(tokenBalance).toFixed()
        )
        if (approveOnly) {
          return
        }

        const txn =
          router.methods.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenBalance,
            0, // NOTE: should use private RPC to prevent frontrunning
            [token, uniswapV2Info[network].wrappedNative],
            wallet,
            dayjs().add(5, 'minutes').unix()
          )
        console.log(
          'SELLING NOW',
          pkeyIdx,
          wallet,
          new BigNumber(tokenBalance).toFixed()
        )
        const gasLimit = await txn.estimateGas({
          from: wallet,
        })
        await txn.send({
          from: wallet,
          gasLimit: new BigNumber(gasLimit).times('1.3').toFixed(0),
        })
        console.log(
          'SUCCESS',
          pkeyIdx,
          wallet,
          new BigNumber(tokenBalance).toFixed()
        )
      } catch (err) {
        console.error(`Issue selling, trying again`, err)
        // await sleep(1000)
        await sellAttemptAndRetryForever(pkeyIdx)
      }
    }

    await Promise.all(
      pkeys.map(async (_, idx) => {
        await sellAttemptAndRetryForever(idx)
      })
    )

    console.log(
      `Successfully finished ${approveOnly ? 'approving' : 'selling'}`,
      token
    )
  } catch (err) {
    console.error(`Error processing`, err)
  } finally {
    process.exit()
  }
})()
