import Web3 from 'web3'
import { AbiItem } from 'web3-utils'

export default function NativeUtils(web3: Web3, contractAddy: string) {
  return new web3.eth.Contract(abi, contractAddy)
}

export const abi: AbiItem[] = [
  {
    inputs: [
      {
        internalType: 'address[]',
        name: '_addresses',
        type: 'address[]',
      },
    ],
    name: 'balances',
    outputs: [
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
]
