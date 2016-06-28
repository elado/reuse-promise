// TODO compare key with shallow equal, not JSON
// TODO equality check function

const _allPromiseMapsByArgs = []
const _allMemoizedValueMapsByArgs = []

function serializeArguments(key) {
  return JSON.stringify(key)
}

export default function reusePromise(origFn, options={}) {
  options = {
    memoize: false,
    serializeArguments,
    ...options
  }

  const promiseMapsByArgs = {}
  const memoizedValuesByArgs = {}

  const wrappedFn = function (...args) {
    const key = options.serializeArguments(args)

    const pendingPromise = promiseMapsByArgs[key]

    if (pendingPromise) return pendingPromise

    if (options.memoize && key in memoizedValuesByArgs) return Promise.resolve(memoizedValuesByArgs[key])

    const forgetPromise = () => delete promiseMapsByArgs[key]

    const origPromise = origFn.apply(this, args)

    const promise = origPromise.then(value => {
      if (options.memoize) memoizedValuesByArgs[key] = value
      forgetPromise()
      return value
    }, err => {
      forgetPromise()
      throw err
    })
    promiseMapsByArgs[key] = promise

    return promise
  }

  wrappedFn.__reusePromise__origFn = origFn
  wrappedFn.__reusePromise__clear = function () { reusePromise.clear(wrappedFn) }
  wrappedFn.__reusePromise__promiseMapsByArgs = promiseMapsByArgs
  wrappedFn.__reusePromise__memoizedValuesByArgs = memoizedValuesByArgs
  _allPromiseMapsByArgs.push(promiseMapsByArgs)
  _allMemoizedValueMapsByArgs.push(memoizedValuesByArgs)

  return wrappedFn
}

function clearObject(object) {
  Object.keys(object).forEach(k => delete object[k])
}

export function clear(fn=undefined) {
  if (fn === undefined) {
    _allPromiseMapsByArgs.forEach(clearObject)
    _allMemoizedValueMapsByArgs.forEach(clearObject)
  }
  else {
    clearObject(fn.__reusePromise__promiseMapsByArgs)
    clearObject(fn.__reusePromise__memoizedValuesByArgs)
  }
}

export function decorator(options={}) {
  return function (target, name, descriptor) {
    descriptor.value = reusePromise(descriptor.value, options)
    return descriptor
  }
}

decorator.clear = clear
reusePromise.clear = clear
