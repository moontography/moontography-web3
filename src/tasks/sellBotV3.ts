require('dotenv').config()

import assert from 'assert'
import BigNumber from 'bignumber.js'
import dayjs from 'dayjs'
import minimist from 'minimist'
import { sleep } from '../libs/Helpers'
import {
  addAllAccountsToWeb3,
  genericErc20Approval,
  getIdealV3TokenPoolFee,
  randomizeObjectKeys,
  uniswapV3Info,
} from '../libs/Web3Utils'
import ERC20 from '../libs/web3/ERC20'
import SwapRouter from '../libs/web3/SwapRouter'
import WETH from '../libs/web3/WETH'

const argv = minimist(process.argv.slice(2), {
  string: ['a', 'address', 'n', 'network', 't', 'token'],
})
const token = argv.t || argv.token
const network = argv.n || argv.network || 'eth'
const numWallets = argv.w || argv.wallets || 1
const approveOnly = argv.a || argv.approve

;(async function sellBotV3() {
  try {
    assert(token, `Need token contract to try to sell`)

    const pkeyVarRegExp = /BUY_WALLET_PKEY_(\d+)/
    const allPkeys = randomizeObjectKeys(process.env, pkeyVarRegExp)

    const web3 = uniswapV3Info[network].utils.web3
    const router = SwapRouter(web3, uniswapV3Info[network].router)
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

        console.log(
          'APPROVING',
          pkeyIdx,
          wallet,
          new BigNumber(tokenBalance).toFixed()
        )
        await genericErc20Approval(
          web3,
          wallet,
          tokenBalance,
          token,
          uniswapV3Info[network].router
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

        const poolFee = await getIdealV3TokenPoolFee(
          web3,
          uniswapV3Info[network].factory,
          uniswapV3Info[network].wrappedNative,
          token
        )
        const txn = router.methods.exactInputSingle([
          token,
          uniswapV3Info[network].wrappedNative,
          poolFee,
          wallet,
          `${dayjs().add(5, 'minutes').unix()}`,
          tokenBalance,
          '0', // NOTE: should use private RPC to prevent frontrunning
          '0', // NOTE: should use private RPC to prevent frontrunning
        ])
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
        // let node catch up to new WETH balance
        await sleep(1000)
        const weth = WETH(web3, uniswapV3Info[network].wrappedNative)
        const wethBal = await weth.methods.balanceOf(wallet).call()
        const unwrap = weth.methods.withdraw(wethBal)
        const unwrapGasLimit = await unwrap.estimateGas({
          from: wallet,
        })
        await unwrap.send({
          from: wallet,
          gasLimit: new BigNumber(unwrapGasLimit).times('1.3').toFixed(0),
        })
        console.log(
          'SUCCESS',
          pkeyIdx,
          wallet,
          new BigNumber(tokenBalance).toFixed()
        )
      } catch (err) {
        console.error(`Issue selling, trying again`, err)
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
