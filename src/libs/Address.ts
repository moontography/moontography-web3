import crypto from 'crypto'
import { privateToAddress, privateToPublic } from 'ethereumjs-util'

export interface IAddress {
  address?: string
  privKey?: string
  pubKey?: string
}

export function getAddressFromPrivateKey(hexOrUtf8String: string): IAddress {
  let privateKey = Buffer.from(hexOrUtf8String, 'hex')

  // if the string provided is not 256 bits, SHA256 hash it and
  // return back as hex which will always be 256 bits.
  // if (Buffer.byteLength(hexOrUtf8String, 'hex') !== 256 / 8) {
  privateKey = Buffer.from(stringToHash(hexOrUtf8String), 'hex')
  // }
  return {
    address: `0x${privateToAddress(privateKey).toString('hex')}`,
    privKey: privateKey.toString('hex'),
    pubKey: privateToPublic(privateKey).toString('hex'),
  }
}

export function stringToHash(string: string, hashAlgo: string = 'sha256') {
  const md5Sum = crypto.createHash(hashAlgo)
  md5Sum.update(string)
  return md5Sum.digest('hex')
}
