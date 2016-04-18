# reuse-promise

[![build status](https://img.shields.io/travis/elado/reuse-promise/master.svg?style=flat-square)](https://travis-ci.org/elado/reuse-promise) [![npm version](https://img.shields.io/npm/v/reuse-promise.svg?style=flat-square)](https://www.npmjs.com/package/reuse-promise) [![codeclimate](https://img.shields.io/codeclimate/github/elado/reuse-promise.svg?style=flat-square)](https://codeclimate.com/github/elado/reuse-promise)

## Purpose

When a function returns a promise and it's being called from multiple places in the app, new promises are being instantiated, and multiple async operations are be executed.

A common case is a function that gets an `articleId` and returns a promise that calls API. This function can be called from multiple places, each time will create a new promise and will issue a new request. This is usually not desired:

```js
function findArticle(articleId) {
  return new Promise((resolve, reject) => {
    fetch(`/article/${articleId}`).then(r => r.json()).then(function (data) {
      resolve(data)
    })
  })
}

// will issue first request for articleId=1
findArticle(1).then(article1 => console.log(article1))
// will issue second request for articleId=1
findArticle(1).then(article1 => console.log(article1))
// will issue first request for articleId=2
findArticle(2).then(article2 => console.log(article2))
```

`reuse-promise` decorates a function and temporary memoizes a promise until it's resolved. In this case, the first call for `articleId=1` will create the new promise, issue the HTTP request, and remember that created promise for `articleId=1`. The second call with the same argument will return the same promise from earlier call.

Promises are kept in cache and returned without recreating a new one only while they are in progress. When the promise is resolved, it'll be cleared from this temporary cache, allowing a new call to `findArticle(1)` to recreate a promise and issue an HTTP request.

Promises are kept in an index by the arguments that were sent to the function, so `findArticle(1)` and `findArticles([1, 2, 3])` will go through the original function and create a new promise, and any following call with the same arguments will reuse the same promise. The comparison between two sets of arguments is by `JSON.stringify` the argument array, hence a call with a new array [1, 2, 3] will still reuse the same promise.

## Installation

```sh
npm install reuse-promise --save
```

## Usage

`reuse-promise` can be used as a decorator in a class definition or as a wrapper to a function.

### As a class decoartor

Requires `babel` and `babel-plugin-transform-decorators-legacy` plugin.

```js
import { decorator as reusePromise } from 'reuse-promise'

class ArticleService {
  @reusePromise()
  find(articleId) {
    return new Promise((resolve, reject) => {
      fetch(`/article/${articleId}`).then(r => r.json()).then(function (data) {
        resolve(data)
      })
    })
  }
}

const articleService = new ArticleService()

// will issue first request for articleId=1
articleService.find(1).then(article1 => console.log(article1))
// WILL NOT issue any request for articleId=1, will reuse the promise that was created in previous call
articleService.find(1).then(article1 => console.log(article1))
// will issue first request for articleId=2
articleService.find(2).then(article2 => console.log(article2))
```

### Wrapping a function

```js
import reusePromise from 'reuse-promise'

function findArticle(articleId) {
  return new Promise((resolve, reject) => {
    fetch(`/article/${articleId}`).then(r => r.json()).then(function (data) {
      resolve(data)
    })
  })
}

const findArticleReusedPromise = reusePromise(findArticle)


// will issue first request for articleId=1
findArticleReusedPromise(1).then(article1 => console.log(article1))
// WILL NOT issue any request for articleId=1, will reuse the promise that was created in previous call
findArticleReusedPromise(1).then(article1 => console.log(article1))
// will issue first request for articleId=2
findArticleReusedPromise(2).then(article2 => console.log(article2))
```

### option: `memoize`

`reuse-promise` can indefinitely remember the value that was returned from a promise, so no async code will execute more than once, even if the promise was previously resolved:

```js
import { decorator as reusePromise } from 'reuse-promise'

class ArticleService {
  @reusePromise({ memoize: true })
  find(articleId) {
    return new Promise((resolve, reject) => {
      fetch(`/article/${articleId}`).then(r => r.json()).then(function (data) {
        resolve(data)
      })
    })
  }
}

const articleService = new ArticleService()

articleService.find(1).then(article1 => console.log(article1))

setTimeout(() => {
  // here, the original promise is resolved
  // without memoize: true, calling find(1) would go through original function and create a promise
  // however, with memoize the following call will be immediately resolved with the value

  articleService.find(1).then(article1 => console.log(article1))
}, 1000)
```


## Test

```sh
npm install
npm test
```

## License

MIT
