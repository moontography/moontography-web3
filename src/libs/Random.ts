import { randomBytes } from 'crypto'

export default {
  bytes(
    length: number = Math.ceil(Math.random() * 1e6) + 256
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      randomBytes(length, (err, buffer) => {
        if (err) return reject(err)
        resolve(buffer)
      })
    })
  },
}
