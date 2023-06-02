require('dotenv').config()

import assert from 'assert'
import BigNumber from 'bignumber.js'
import dayjs from 'dayjs'
import minimist from 'minimist'
import Web3 from 'web3'
import Web3Utils, { addAllAccountsToWeb3 } from '../libs/Web3Utils'
import ERC20 from '../libs/web3/ERC20'
import IUniswapV3Factory from '../libs/web3/IUniswapV3Factory'
import SwapRouter from '../libs/web3/SwapRouter'

const argv = minimist(process.argv.slice(2), {
  string: ['a', 'address', 'n', 'network', 't', 'token'],
})
const token = argv.t || argv.token
// const network = argv.n || argv.network || 'eth'
const network = 'eth'
const numWallets = argv.w || argv.wallets || 1
const balancePercentage = argv.p || argv.percentage || 40

const info: any = {
  // bsc: {
  //   factory: '',
  //   router: '',
  //   wrappedNative: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
  //   utils: Web3Utils(null, `https://bsc-dataseed.binance.org/`),
  // },
  eth: {
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    router: '0xe592427a0aece92de3edee1f18e0157c05861564',
    wrappedNative: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    utils: Web3Utils(null, `https://rpc.mevblocker.io/norefunds`),
  },
}

;(async function buyBotV3() {
  try {
    assert(token, `Need token contract to try to buy`)

    const web3 = info[network].utils.web3
    const router = SwapRouter(web3, info[network].router)
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
        const poolFee = await getIdealTokenPoolFee(
          web3,
          info[network].factory,
          info[network].wrappedNative,
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

async function getIdealTokenPoolFee(
  web3: Web3,
  factoryAddress: string,
  wrappedNative: string,
  t0: string,
  t1: string
) {
  const fees: number[] = [100, 500, 3000, 10000]
  const factory = IUniswapV3Factory(web3, factoryAddress)
  const wnative = ERC20(web3, wrappedNative)
  const pools = await Promise.all([
    factory.methods.getPool(t0, t1, fees[0]).call(),
    factory.methods.getPool(t0, t1, fees[1]).call(),
    factory.methods.getPool(t0, t1, fees[2]).call(),
    factory.methods.getPool(t0, t1, fees[3]).call(),
  ])
  const filteredPools = pools
    .map((pool, idx) => ({ pool, idx }))
    .filter((p) => new BigNumber(p.pool.toLowerCase()).gt(0))
  if (filteredPools.length == 1) {
    return fees[filteredPools[0].idx]
  }

  const wrappedNativeBalances = await Promise.all(
    filteredPools.map(async (info) => {
      return {
        ...info,
        balance: await wnative.methods.balanceOf(info.pool).call(),
      }
    })
  )
  const [desiredPool] = wrappedNativeBalances.sort((i1, i2) =>
    new BigNumber(i2.balance).minus(i1.balance).toNumber()
  )
  return fees[desiredPool.idx]
}
