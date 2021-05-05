import assert from 'assert'
import { exponentialBackoff, sleep } from './Helpers'

describe('Promises', function() {
  describe('#exponentialBackoff', function() {
    it(`should wait 5 tries and then resolve the function after exponentially backing off`, async function() {
      this.timeout(10000)

      const tries = 5
      let iteration = 0
      const foo1 = async function() {
        iteration++
        if (iteration == 3) return true

        throw new Error('Not enough tries!')
      }

      const startTime = Date.now()
      const shouldBeTrue = await exponentialBackoff(
        foo1,
        (err: Error, attempt: number) =>
          assert.strictEqual(true, err instanceof Error),
        null,
        tries
      )
      const endTime = Date.now()

      assert.strictEqual(true, shouldBeTrue)
      assert.strictEqual(true, endTime - startTime >= 7 * 1000)
    })

    it(`with a promise nested in an async function, should wait 5 tries and then resolve the function after exponentially backing off`, async function() {
      this.timeout(10000)

      const tries = 5
      let iteration = 0
      const foo1 = async function() {
        return await new Promise((resolve, reject) => {
          iteration++
          if (iteration == 3) resolve(true)

          reject(new Error('Not enough tries!'))
        })
      }

      const startTime = Date.now()
      const shouldBeTrue = await exponentialBackoff(
        foo1,
        (err: Error, attempt: number) =>
          assert.strictEqual(true, err instanceof Error),
        null,
        tries
      )
      const endTime = Date.now()

      assert.strictEqual(true, shouldBeTrue)
      assert.strictEqual(true, endTime - startTime >= 7 * 1000)
    })
  })

  describe('#sleep', function() {
    it(`should wait for the specified number of milliseconds before executing the following code`, async function() {
      const waitTime = 100
      const start = Date.now()
      await sleep(waitTime)
      const end = Date.now()

      assert.strictEqual(true, end >= start + waitTime)
    })
  })
})
