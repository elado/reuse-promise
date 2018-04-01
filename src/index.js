const _allPromiseMapsByArgs = []

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

  const wrappedFn = function (...args) {
    const key = options.serializeArguments(args)

    const pendingPromise = promiseMapsByArgs[key]

    if (pendingPromise) return pendingPromise

    const forgetPromise = () => delete promiseMapsByArgs[key]

    const origPromise = origFn.apply(this, args)

    const promise = origPromise.then(value => {
      if (!options.memoize) forgetPromise()
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
  _allPromiseMapsByArgs.push(promiseMapsByArgs)

  return wrappedFn
}

function clearObject(object) {
  Object.keys(object).forEach(k => delete object[k])
}

export function clear(fn=undefined) {
  if (fn === undefined) {
    _allPromiseMapsByArgs.forEach(clearObject)
  }
  else {
    clearObject(fn.__reusePromise__promiseMapsByArgs)
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
