import { randomBytes } from 'crypto'

export default {
  bytes(length: number = Math.floor(Math.random() * 1e5) + 4): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      randomBytes(Math.ceil(length / 2), (err, buffer) => {
        if (err) return reject(err)
        resolve(buffer)
      })
    })
  },
}
