// TODO compare key with shallow equal, not JSON
// TODO equality check function

const pendingPromisesMap = (() => {
  const FN_INDEX = 0
  const KEY_INDEX = 1
  const VALUE_INDEX = 2

  const a = []

  function serializeKey(key) {
    return JSON.stringify(key)
  }

  function is(item, fn, serializedKey) {
    if (item[FN_INDEX] == fn && item[KEY_INDEX] == serializedKey) {
      return true
    }
    return false
  }

  function getIndex(fn, serializedKey) {
    for (let i = 0, l = a.length; i < l; i++) {
      const item = a[i]

      if (is(item, fn, serializedKey)) {
        return i
      }
    }

    return -1
  }

  function get(fn, key) {
    const serializedKey = serializeKey(key)
    const i = getIndex(fn, serializedKey)

    if (a[i]) {
      return a[i][VALUE_INDEX]
    }

    return null
  }

  function set(fn, key, value) {
    const serializedKey = serializeKey(key)
    const i = getIndex(fn, serializedKey)

    if (i > -1) {
      a[i][VALUE_INDEX] = value
    }
    else {
      const obj = []
      obj[FN_INDEX] = fn
      obj[KEY_INDEX] = serializedKey
      obj[VALUE_INDEX] = value
      a.push(obj)
    }

    return value
  }

  function del(fn, key) {
    if (key === undefined) {
      // delete all of function
      for (let i = a.length - 1; i >= 0; i--) {
        const item = a[i]
        if (item[FN_INDEX] == fn) {
          a.splice(i, 1)
        }
      }
    }
    else {
      // delete single entry by function and key
      const serializedKey = serializeKey(key)
      const i = getIndex(fn, serializedKey)
      if (i > -1) {
        a.splice(i, 1)
      }
    }
  }

  function clear() {
    a.length = 0
  }

  return {
    get,
    set,
    del,
    clear
  }
})()

export default function reusePromise(origFn, options={}) {
  options = Object.assign({ memoize: false }, options)

  const wrappedFn = function (...args) {
    const key = args
    const memoizeValueKey = [ 'memoized', key ]

    const pendingPromise = pendingPromisesMap.get(origFn, key)

    if (pendingPromise) {
      return pendingPromise
    }

    if (options.memoize) {
      const prevValue = pendingPromisesMap.get(origFn, memoizeValueKey)

      if (prevValue) {
        return Promise.resolve(prevValue)
      }
    }

    const forgetPromise = () => {
      pendingPromisesMap.del(origFn, key)
    }

    const origPromise = origFn.apply(this, args)

    let promise = origPromise.then(value => {
      if (options.memoize) {
        pendingPromisesMap.set(origFn, memoizeValueKey, value)
      }

      forgetPromise()
      return value
    }, (err) => {
      forgetPromise()
      throw err
    })
    pendingPromisesMap.set(origFn, key, promise)

    return promise
  }

  wrappedFn.__reusePromise__origFn = origFn
  wrappedFn.__reusePromise__clear = function () {
    reusePromise.clear(origFn)
  }

  return wrappedFn
}

export function clear(fn=undefined) {
  if (fn == undefined) {
    pendingPromisesMap.clear()
  }
  else {
    pendingPromisesMap.del(fn.__reusePromise__origFn || fn)
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
