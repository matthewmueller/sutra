'use strict'

/**
 * Module Dependencies
 */

let stringify = require('json-stringify-safe')
let assign = require('object-assign')
let assert = require('assert')
let log = require('..')
let bl = require('bl')
let os = require('os')

/**
 * OS stuff
 */

let hostname = os.hostname()
let pid = process.pid

/**
 * Tests
 */

describe('log', function () {
  afterEach(function () {
    log.reset()
  })

  describe('global', function () {
    it('strings', function (done) {
      let sink = bl()
      log.pipe(sink)
      log.debug('debug!')
      log.warn('warning!')
      eq(sink, [
        { level: 'debug', name: 'root', message: 'debug!' },
        { level: 'warn', name: 'root', message: 'warning!' }
      ])
      sink.end(done)
    })

    it('printf', function (done) {
      let sink = bl()
      log.pipe(sink)
      log.debug('%s!', 'debug')
      log.warn('%s!', 'warning')
      eq(sink, [
        { level: 'debug', name: 'root', message: 'debug!' },
        { level: 'warn', name: 'root', message: 'warning!' }
      ])
      sink.end(done)
    })

    it('obj with custom field', function (done) {
      let sink = bl()
      log.pipe(sink)
      log.fatal({ message: 'some fatal!', line: 15 })
      log.error({ message: 'some error!', line: 20 })
      eq(sink, [
        { level: 'fatal', name: 'root', message: 'some fatal!', fields: { line: 15 } },
        { level: 'error', name: 'root', message: 'some error!', fields: { line: 20 } }
      ])
      sink.end(done)
    })

    it('fields', function (done) {
      let sink = bl()
      log.pipe(sink)
      log.fields({ team: 'soloists' })
      log.fatal({ message: 'some fatal!', line: 15 })
      log.error({ message: 'some error!', line: 20 })
      eq(sink, [
        { level: 'fatal', name: 'root', message: 'some fatal!', fields: { team: 'soloists', line: 15 } },
        { level: 'error', name: 'root', message: 'some error!', fields: { team: 'soloists', line: 20 } }
      ])
      sink.end(done)
    })

    it('errors', function (done) {
      let sink = bl()
      log.pipe(sink)
      log.fatal(new Error('headshot'))
      var err = new SyntaxError('oh dear')
      err.code = 'SYNTAX'
      log.error(err)

      eq(sink, [
        {
          level: 'fatal',
          name: 'root',
          message: 'headshot',
          err: {
            message: 'headshot',
            name: 'Error',
            stack: 'STACK'
          }
        },
        {
          level: 'error',
          name: 'root',
          message: 'SYNTAX: oh dear',
          err: {
            message: 'oh dear',
            name: 'SyntaxError',
            code: 'SYNTAX',
            stack: 'STACK'
          }
        }
      ])

      sink.end(done)
    })
  })

  describe('tree', function () {
    it('any', function (done) {
      let root = bl()
      let a = bl()
      let b = bl()
      let c = bl()

      log.pipe(root)

      let la = log('la').pipe(a)
      let lb = log('lb').pipe(b)
      let lc = lb('lc').pipe(c)

      la.info('la')
      lb.info('lb')
      lc.info('lc')

      eq(root, [
        { level: 'info', name: 'la', message: 'la' },
        { level: 'info', name: 'lb', message: 'lb' },
        { level: 'info', name: 'lb:lc', message: 'lc' }
      ])

      eq(a, [
        { level: 'info', name: 'la', message: 'la' }
      ])

      eq(b, [
        { level: 'info', name: 'lb', message: 'lb' },
        { level: 'info', name: 'lb:lc', message: 'lc' }
      ])

      eq(c, [
        { level: 'info', name: 'lb:lc', message: 'lc' }
      ])

      root.end(() => a.end(() => b.end(() => c.end(() => done()))))
    })

    it('levels', function (done) {
      let root = bl()
      let a = bl()
      let b = bl()
      let c = bl()

      log.debug.pipe(root)

      let la = log('la')
      let lb = log('lb')

      la.info.pipe(a)
      lb.warn.pipe(b)

      let lc = lb('lc')
      lc.error.pipe(c)

      la.debug('lad')
      la.info('lai')
      la.error('lae')

      lb.debug('lbd')
      lb.warn('lbw')
      lb.fatal('lbf')

      lc.debug('lcd')
      lc.info('lci')
      lc.warn('lcw')
      lc.error('lce')
      lc.fatal('lcf')

      eq(root, [
        { level: 'debug', name: 'la', message: 'lad' },
        { level: 'debug', name: 'lb', message: 'lbd' },
        { level: 'debug', name: 'lb:lc', message: 'lcd' }
      ])

      eq(a, [
        { level: 'info', name: 'la', message: 'lai' }
      ])

      eq(b, [
        { level: 'warn', name: 'lb', message: 'lbw' },
        { level: 'warn', name: 'lb:lc', message: 'lcw' }
      ])

      eq(c, [
        { level: 'error', name: 'lb:lc', message: 'lce' }
      ])

      root.end(() => a.end(() => b.end(() => c.end(() => done()))))
    })

    it('fields', function (done) {
      let root = bl()
      let a = bl()
      let b = bl()
      let c = bl()

      log.fields({ root: 'root' })
      log.debug.pipe(root)
      log.debug.fields({ root: 'debug' })

      let la = log('la')
      let lb = log('lb')

      la.fields({ a: 'a' })
      lb.warn.fields({ b: 'b'})

      la.info.pipe(a)
      lb.warn.pipe(b)

      let lc = lb('lc')
      lc.error.pipe(c)
      lc.error.fields({ 'c': 'c' })

      la.debug('lad')
      la.info('lai')
      la.error('lae')

      lb.debug('lbd')
      lb.warn('lbw')
      lb.fatal('lbf')

      lc.debug('lcd')
      lc.info('lci')
      lc.warn('lcw')
      lc.error('lce')
      lc.fatal('lcf')

      eq(root, [
        { level: 'debug', name: 'la', message: 'lad', fields: { a: 'a', root: 'debug' } },
        { level: 'debug', name: 'lb', message: 'lbd', fields: { root: 'debug' } },
        { level: 'debug', name: 'lb:lc', message: 'lcd', fields: { root: 'debug' } }
      ])

      eq(a, [
        { level: 'info', name: 'la', message: 'lai', fields: { a: 'a', root: 'root' } }
      ])

      eq(b, [
        { level: 'warn', name: 'lb', message: 'lbw', fields: { b: 'b', root: 'root' } },
        { level: 'warn', name: 'lb:lc', message: 'lcw', fields: { b: 'b', root: 'root' } }
      ])

      eq(c, [
        { level: 'error', name: 'lb:lc', message: 'lce', fields: { c: 'c', root: 'root' } }
      ])

      root.end(() => a.end(() => b.end(() => c.end(() => done()))))
    })
  })

  describe('fixes', function () {
    it('should use references (#1)', function (done) {
      let sink = bl()
      let a = log('a')
      log.pipe(sink)
      a.info('a')
      eq(sink, [
        { level: 'info', name: 'a', message: 'a' }
      ])
      sink.end(done)
    })

    it('should use same pipes for same namespaces (#2)', function (done) {
      let sink = bl()
      let a = log('a')
      a.pipe(sink)
      a.info('a')
      let b = log('a')
      b.warn('b')
      eq(sink, [
        { level: 'info', name: 'a', message: 'a' },
        { level: 'warn', name: 'a', message: 'b' }
      ])
      sink.end(done)
    })

    it('should send to all loo instances on the process', function (done) {
      let sink = bl()
      let a = log('a')
      log.pipe(sink)
      global['loo'].emit('log', { level: 'info', name: 'root:a', message: 'a' })
      eq(sink, [
        { level: 'info', name: 'a', message: 'a' }
      ])
      sink.end(done)
    })
  })

  describe('smart formatting', function () {
    it('should handle printf strings + fields', function (done) {
      let sink = bl()
      let a = log('a')
      log.pipe(sink)

      a.info('message %d %s: %j', 1, 'anh', { message: 'test' }, { another: 'field' })
      eq(sink, [
        { level: 'info', name: 'a', message: 'message 1 anh: {"message":"test"}', 'fields': {'another': 'field'} }
      ])
      sink.end(done)
    })

    it('should ignore if there arent enough args for printf', function (done) {
      let sink = bl()
      let a = log('a')
      log.pipe(sink)
      a.info('message %d %s: %j', 1, 'anh')
      eq(sink, [
        {'level': 'info','name': 'a','message': 'message 1 anh: %j','host': 'matt'}
      ])
      sink.end(done)
    })

    it('should ignore if there is an undefined value for one of the arguments', function (done) {
      let sink = bl()
      let a = log('a')
      log.pipe(sink)
      a.info('message %d %s: %j', undefined, 'anh', undefined, { another: 'field' })
      eq(sink, [
        { level: 'info', name: 'a', message: 'message NaN anh: undefined', 'fields': {'another': 'field'} }
      ])
      sink.end(done)
    })

    it('should handle log.info(0) and log.info(undefined) and log.info(null)', function (done) {
      let sink = bl()
      let a = log('a')
      log.pipe(sink)
      a.info(0)
      a.info(null)
      a.info(undefined)
      eq(sink, [
        {'level': 'info','name': 'a','message': 0,'host': 'matt'},
        {'level': 'info','name': 'a','message': null,'host': 'matt'},
        {'level': 'info','name': 'a','host': 'matt'}
      ])
      sink.end(done)
    })
  })

})

function eq (actual, expected) {
  expected = expected.map(function (log) {
    return stringify(assign(
      { time: (new Date()).toISOString() },
      log,
      { host: hostname, pid: pid }
    )) + '\n'
  }).join('')

  actual = safe(string(actual))
  expected = safe(expected)
  assert.equal(actual, expected)
}

function string (sink) {
  return sink.slice().toString()
}

function safe (str) {
  return str
    .replace(/("time":"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}):\d{2}\.\d{3}Z"/g, '$1:xx.xxxZ')
    .replace(/("remoteAddress":")(?:::ffff:)?(127.0.0.1")/g, '$1$2')
    .replace(/("host":")(?:(?:localhost)|(?:::))(:\d+")/g, '$1$2')
    .replace(/("stack":")SyntaxError:[^"]+/, '$1STACK')
    .replace(/("stack":")Error:[^"]+/, '$1STACK')
}
