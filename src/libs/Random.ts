import { randomBytes } from 'crypto'

export default {
  bytes(
    length: number = Math.floor(Math.random() * 1e5) + 256
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      randomBytes(Math.ceil(length), (err, buffer) => {
        if (err) return reject(err)
        resolve(buffer)
      })
    })
  },
}
