# reuse-promise

[![build status](https://img.shields.io/travis/elado/reuse-promise/master.svg?style=flat-square)](https://travis-ci.org/elado/reuse-promise) [![npm version](https://img.shields.io/npm/v/reuse-promise.svg?style=flat-square)](https://www.npmjs.com/package/reuse-promise) [![codeclimate](https://img.shields.io/codeclimate/github/elado/reuse-promise.svg?style=flat-square)](https://codeclimate.com/github/elado/reuse-promise)

## Purpose

> **TL;DR** - Prevent from a unique async process (function that returns a promise) to run more than once concurrently by temporarily caching the promise until it's resolved/rejected.

When a function returns a promise and it's being called from multiple places in the app, new promises are being instantiated, and multiple async operations are going to be executed.

A common case is a function that gets an `articleId` and returns a promise that calls API. This function can be called from multiple places, each time will create a new promise and will issue a new request. This is usually not desired:

```js
function findArticle(articleId) {
  return fetch(`/article/${articleId}`).then(r => r.json())
  // could also be
  // return new Promise(...)
}

// will issue first request for articleId=1
findArticle(1).then(article1 => console.log(article1))
// will issue second request for articleId=1
findArticle(1).then(article1 => console.log(article1))
// will issue first request for articleId=2
findArticle(2).then(article2 => console.log(article2))
```

`reuse-promise` decorates a function and **temporary** memoizes a promise until it's resolved. In this case, the first call for `articleId=1` will create the new promise, issue the HTTP request, and remember that created promise for `articleId=1`. The second call with the same argument will return the same promise from earlier call. However, once the original promise is resolved (or rejected), a new call to `findArticle(1)` will issue a new request.

An initial call to a wrapped function goes through the original function, and then indexes the returned promise by a json-serialized string of the arguments that were sent to the function. So `findArticles([1, 2, 3])` can be called twice and still return the same promise, becasue `JSON.stringify([1, 2, 3]) === JSON.stringify([1, 2, 3])`.

## Installation

```sh
npm install reuse-promise --save
```

## Usage

`reuse-promise` can be used as a decorator in a class definition or as a wrapper to a function.

### As a class decorator

Requires `babel` and `babel-plugin-transform-decorators-legacy` plugin.

```js
import { decorator as reusePromise } from 'reuse-promise'

class ArticleService {
  @reusePromise()
  find(articleId) {
    return fetch(`/article/${articleId}`).then(r => r.json())
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
  return fetch(`/article/${articleId}`).then(r => r.json())
}

const findArticleReusedPromise = reusePromise(findArticle/*, options */)


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
    return fetch(`/article/${articleId}`).then(r => r.json())
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

Clearing all memoized values of a function can be done with:

```js
reusePromise.clear(articleService.find)

// or
articleService.find.__reusePromise__clear()
```

Clear all:

```js
reusePromise.clear()
```

### option `serializeArguments`

A custom argument serializer can be provided. To reuse promises based on the first letter of the first argument, for example, provide:

```js
{
  serializeArguments: args => args[0][0]
}
```

## Test

```sh
npm install
npm test
```

## License

MIT
