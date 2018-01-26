var fs = require('fs')
var path = require('path')
var http = require('http')
var assert = require('assert')
var wayfarer = require('wayfarer')
var serveStatic = require('serve-static')
var Stack = require('./')

var STATIC = ['assets', 'public', 'content']
var ASSET_REGEX = /^\/(\w+\/)?(bundle|service-worker)\.(js|css)$/

module.exports = Server

function Server (entry, opts) {
  Stack.call(this, entry, opts)
  this.router = wayfarer()
}

Server.prototype = Object.create(Stack.prototype)
Server.prototype.constructor = Server

Server.prototype.start = function (port, callback) {
  callback = callback || function () {}
  port = port || process.env.PORT || 8080

  assert(!isNaN(+port), 'stack: port cannot be not a number 🤪')
  assert(typeof callback === 'function', 'stack: callback must be a function')

  var self = this
  var dirs = []
  var queue = STATIC.length - 1
  for (var i = 0, len = STATIC.length; i < len; i++) {
    lookup(path.resolve(path.dirname(this.opts.entry), STATIC[i]))
  }

  function lookup (dir) {
    fs.lstat(dir, function (err, stats) {
      if (!err && stats.isDirectory()) dirs.push(dir)
      if (queue-- === 0) start()
    })
  }

  function start () {
    var serve = dirs.reduceRight(function (prev, dir) {
      var middleware = serveStatic(dir)
      return function (req, res, next) {
        prev(req, res, function () {
          middleware(req, res, next)
        })
      }
    }, function (req, res, next) {
      next(req, res)
    })

    var server = http.createServer(function (req, res) {
      serve(req, res, function () {
        self.middleware(req, res, function () {
          res.statusCode = 404
          res.end()
        })
      })
    })

    server.listen(port, function () {
      console.info(`> Server listening @ http://localhost:${port}`)
      callback()
    })
  }
}

Server.prototype.middleware = function (req, res) {
  var self = this
  var asset = req.url.match(ASSET_REGEX)

  if (asset) {
    if (asset[1] && process.env.NODE_ENV === 'development') {
      return end(400, 'stack: hashed assets not available during development')
    }

    if (asset[2] === 'bundle') {
      if (asset[3] === 'js') return this.main.middleware(req, res)
      if (asset[3] === 'css') {
        if (!this.styles) return end(400, 'stack: no css registered with stack')
        return this.styles.middleware(req, res)
      }
    } else if (asset[2] === 'service-worker') {
      if (!this.sw) return end(400, 'stack: no service worker registered with stack')
      return this.sw.middleware(req, res)
    }

    return end(400, 'stack: asset not recognized')
  }

  try {
    // try and get handler for route
    var handler = this.app.router.match(req.url).cb

    // populate state with route params and whatnot
    var props = this.app._matchRoute(req.url)

    var ctx = {
      req: req,
      res: res,
      href: props.href,
      query: props.query,
      route: props.route,
      params: props.params
    }

    if (typeof handler.getInitialState === 'function') {
      handler.getInitialState(ctx, function (err, state) {
        if (err) {
          self.emit('error', err)
          end(500, err.message)
        } else {
          render(Object.assign(self.getInitialState(), state))
        }
      })
    } else {
      render(self.getInitialState())
    }
  } catch (err) {
    end(404, err.message)
  }

  function render (state) {
    self.document(req.url, state, function (err, buff) {
      if (err) {
        self.emit('error', err)
        return end(500, err.message)
      }

      if (process.env.NODE_ENV !== 'development') {
        var hex = this.main.hash.slice(0, 16)
        res.setHeader('Link', [
          `</${hex}/bundle.js>; rel=preload; as=script`,
          this.css ? `</${hex}/bundle.css>; rel=preload; as=style` : null
        ].filter(Boolean).join(', '))
      }

      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      res.setHeader('Content-Type', 'text/html')
      res.setHeader('Content-Length', buff.length)
      res.end(buff)
    })
  }

  function end (status, message) {
    res.statusCode = status
    res.statusMessage = message
    res.end()
  }
}
