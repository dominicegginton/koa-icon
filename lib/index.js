'use strict'

/* MODULE DEPENDENCIES */
const fs = require('fs-extra')
const etag = require('etag')

/* MODULE VARIABLES */
const ONE_YEAR_MS = 60 * 60 * 24 * 365 // one year in seconds
const ONE_DAY_MS = 60 * 60 * 24 // one day in seconds
const DEFAULT_OPTIONS = {
  maxAge: ONE_DAY_MS,
  type: 'x-icon'
}

/**
 * serves favicon @ /favicon.ico
 * @param {String|Buffer} path path to favicon, or buffer containing favicon data
 * @param {Object} options koa-icon options object
 * @param {Number} options.maxAge maximum time the favicon is caches by client browsers - default one day
 * @param {String} options.type mime type of favicon - default 'x-icon'
 * @returns {Function} middleware serving cached favicon @ /favicon.ico
 */
function middleware (path, options) {
  if (!path) throw new Error('[koa-icon] path is required')

  let favicon

  if (typeof path === 'string') {
    if (!fs.pathExistsSync(path)) throw new Error('[koa-icon] path must exist')
    if (!fs.statSync(path).isFile()) throw new Error('[koa-icon] path must be file not directory')
    favicon = fs.readFileSync(path)
  } else if (Buffer.isBuffer(path)) {
    if (path.length > 0) favicon = Buffer.from(path)
    else throw new Error('[koa-icon] buffer must not be empty')
  } else throw new TypeError('[koa-icon] path must be type string or buffer')

  options = options || DEFAULT_OPTIONS
  options.maxAge = options.maxAge === null ? ONE_DAY_MS : Math.min(Math.max(0, options.maxAge), ONE_YEAR_MS)
  options.type = options.type === null ? 'x-icon' : options.type

  return (ctx, next) => {
    if (ctx.path !== '/favicon.ico') return next()
    if (ctx.method !== 'GET' && ctx.method !== 'HEAD') {
      ctx.status = ctx.method === 'OPTIONS' ? 200 : 405
      ctx.set('Allow', 'GET, HEAD, OPTIONS')
    } else {
      ctx.set('Cache-Control', `public, max-age=${options.maxAge}`)
      ctx.set('ETag', etag(favicon))
      ctx.type = `image/${options.type}`
      ctx.status = 200

      if (ctx.fresh) {
        ctx.status = 304
        return
      }

      ctx.body = favicon
    }
  }
}

module.exports = middleware
