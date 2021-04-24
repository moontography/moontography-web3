import crypto from 'crypto'
import { privateToAddress, privateToPublic } from 'ethereumjs-util'

export interface IAddress {
  address?: string
  privKey?: string
  pubKey?: string
}

export function getAddressFromInput(input: Buffer | string): IAddress {
  const privateKey = Buffer.from(stringToHash(input), 'hex')

  // TODO: figure out how to implement if private key was provided as given
  // if the string provided is not 256 bits, SHA256 hash it and
  // return back as hex which will always be 256 bits.
  // if (Buffer.byteLength(input, 'hex') !== 256 / 8) {
  //   privateKey = Buffer.from(stringToHash(input), 'hex')
  // }
  return {
    address: `0x${privateToAddress(privateKey).toString('hex')}`,
    privKey: privateKey.toString('hex'),
    pubKey: privateToPublic(privateKey).toString('hex'),
  }
}

export function stringToHash(
  input: Buffer | string,
  hashAlgo: string = 'sha256'
) {
  const md5Sum = crypto.createHash(hashAlgo)
  md5Sum.update(input)
  return md5Sum.digest('hex')
}
