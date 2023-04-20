import assert from 'assert'
import fs from 'fs'
import path from 'path'
import BigNumber from 'bignumber.js'
import minimist from 'minimist'
import {
  Multicall,
  ContractCallResults,
  ContractCallContext,
} from 'ethereum-multicall'
import Web3 from 'web3'
import { exponentialBackoff, processMulticallValue } from '../libs/Helpers'
import Random from '../libs/Random'
import { abi as utilsAbi } from '../libs/web3/NativeUtils'
import { getAddressFromInput } from '../libs/Address'

const argv = minimist(process.argv.slice(2))
const initSeed = argv.s || argv.seed
const jsonRpc = argv.r || argv.rpc || 'http://localhost:8545'
const network = argv.n || argv.network || 'eth'
const tries = argv.t || argv.tries || 1e10
const batch = argv.b || argv.batch || 250

const contracts: any = {
  arbitrum: '0x132eEc5b2f65BbEb23e32f761B94F9BF11a6f9B1',
  eth: '0x2876fFB9dc1f990Dac16E10Ef70291414460118C',
  bsc: '0x5D905A0B67Aa6e947c140A848A450D2aefc548C8',
}

const web3 = new Web3(new Web3.providers.HttpProvider(jsonRpc))

;(async function bruteForceNetworkBatchMulticall() {
  const fileStream = fs.createWriteStream(
    path.join(`./addresses_${network}_${Date.now()}.json`)
  )
  try {
    assert(jsonRpc, 'JSON RPC for web3 not provided')
    assert(!isNaN(parseInt(tries)), 'tries is not a number')
    assert(!isNaN(parseInt(batch)), 'batch is not a number')
    const iBatch = parseInt(batch)
    const iTries = parseInt(tries)
    const multicall = new Multicall({
      web3Instance: web3,
      tryAggregate: true,
    })

    let cols: any = []
    let numProcessed = 0
    while (numProcessed < iTries) {
      await exponentialBackoff(
        async () => {
          process.stdout.write(`*`)
          const attempts = new Array(Math.min(iBatch, iTries)).fill(0)
          const addresses = await Promise.all(
            attempts.map(async (_, _i) => {
              const seed = initSeed || (await Random.bytes())
              // { address, privKey, pubKey }
              const info = getAddressFromInput(seed)
              return info
            })
          )

          const callContext: ContractCallContext[] = [
            {
              reference: `balances`,
              contractAddress: contracts[network.toLowerCase()],
              abi: utilsAbi,
              calls: [
                {
                  reference: 'NativeUtils',
                  methodName: 'balances',
                  methodParameters: [addresses.map(({ address }) => address)],
                },
              ],
            },
          ]
          const {
            results: balResults /* , blockNumber */,
          }: ContractCallResults = await multicall.call(callContext)
          const balancesRes =
            balResults &&
            balResults.balances &&
            balResults.balances.callsReturnContext
          const balances = balancesRes[0].returnValues

          addresses.forEach((info, _i) => {
            const ether = new BigNumber(processMulticallValue(balances[_i]))
            const addy = {
              // seed: info.seed,
              address: info.address,
              privKey: info.privKey,
              // pubKey:info.pubKey,
              ether: ether.toFixed(),
            }
            fileStream.write(`${JSON.stringify(addy)}\n`, 'utf-8')
            if (ether.lte(0)) {
              // console.log(`No bueno :(`, JSON.stringify(addy))
            } else {
              console.log(`Found one`, JSON.stringify(addy))
              cols.push(addy)
            }
          })
          numProcessed += iBatch
        }
        // (err: Error) => console.error(`Problem getting balances`, err)
      )
    }

    console.log(`\n${JSON.stringify(cols)}`)
  } catch (err) {
    console.error(`Error finding accounts`, err)
  } finally {
    fileStream.end()
    process.exit()
  }
})()
