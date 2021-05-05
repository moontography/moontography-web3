export async function exponentialBackoff(
  promiseFunction: PromiseFunction,
  failureFunction: any = () => {},
  err: null | Error = null,
  totalAllowedBackoffTries: number = 6,
  backoffAttempt: number = 1
): Promise<any> {
  const backoffSecondsToWait = 2 + Math.pow(backoffAttempt, 2)

  if (backoffAttempt > totalAllowedBackoffTries) throw err

  try {
    const result = await promiseFunction()
    return result
  } catch (err) {
    failureFunction(err, backoffAttempt)
    await sleep(backoffSecondsToWait * 1000)
    return await exponentialBackoff(
      promiseFunction,
      failureFunction,
      err,
      totalAllowedBackoffTries,
      backoffAttempt + 1
    )
  }
}

export /* async */ function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

type PromiseFunction = (foo?: any) => Promise<any>
