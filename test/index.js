import assert from 'assert'
import { decorator as reusePromise } from '../src'

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

describe('reusePromise', function () {
  afterEach(function () {
    reusePromise.clear()
  })

  class Test {
    @reusePromise()
    find(id) {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({ id: id })
        }, 5)
      })
    }

    @reusePromise()
    findWithError(id) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error(id))
        }, 5)
      })
    }

    @reusePromise({ memoize: true })
    findAndMemoize(id) {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({ id: id })
        }, 5)
      })
    }
  }

  let test

  beforeEach(function () {
    test = new Test()
  })

  it('reuses the same promise if the current one is still pending', function () {
    const p1 = test.find(1)
    assert.equal(p1, test.find(1))
  })

  it('creates new promise per each set of arguments, and reuses it before resolved', function () {
    const p1 = test.find(1)
    assert.equal(p1, test.find(1))

    const p2 = test.find(2)
    assert.equal(p2, test.find(2))
    assert.notEqual(p1, test.find(2))

    const p3 = test.find(2, 'a', { x: 1 })
    assert.notEqual(p3, test.find(2))
    assert.equal(p3, test.find(2, 'a', { x: 1 }))
  })

  it('reuses the same returned value if the current one is still pending', function (done) {
    let p1value, p2value

    test.find(1).then(v => { p1value = v; check() })
    test.find(1).then(v => { p2value = v; check() })

    let pending = 2
    const check = () => {
      pending--
      if (pending == 0) {
        assert.equal(p1value, p2value)
        done()
      }
    }
  })

  it('asks for a new promise if previous one was resolved', async function () {
    const p1 = test.find(1)
    assert.equal(p1, test.find(1))

    await sleep(2)

    assert.equal(p1, test.find(1))

    await sleep(7)

    assert.notEqual(p1, test.find(1))
  })

  it('keeps the previous value if {memoize: true} even after promise resolved', async function () {
    const p1value = await test.findAndMemoize(1)
    const p2value = await test.findAndMemoize(1)

    assert.equal(p1value, p2value)
  })

  it('fullfils the promise once with same value', function (done) {
    const promises = [ test.find(1), test.find(1), test.find(1) ]
    const values = []
    let pending = promises.length

    promises.forEach(p => {
      p.then(v => {
        values.push(v)
        check()
      })
    })

    function check() {
      pending--
      if (pending == 0) {
        for (let i = 0; i < values.length - 1; i++) {
          assert.equal(values[i], values[i + 1])
        }
        done()
      }
    }
  })

  it('rejects the promise once with same error', function (done) {
    const promises = [ test.findWithError(1), test.findWithError(1), test.findWithError(1) ]
    const errors = []
    let pending = promises.length

    promises.forEach(p => {
      p.then(() => {
        assert.fail()
      }, err => {
        errors.push(err)
        check()
      })
    })

    function check() {
      pending--

      if (pending == 0) {
        for (let i = 0; i < errors.length - 1; i++) {
          assert.equal(errors[i], errors[i + 1])
        }
        done()
      }
    }
  })

  it('can clear cache for specific function', async function () {
    const p1 = test.find(1)
    assert.equal(p1, test.find(1))

    test.find.__reusePromise__clear()
    assert.notEqual(p1, test.find(1))
  })
})

