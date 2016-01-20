# fakeredis

[![npm version][npm-badge]][npm-url]
[![Build Status][travis-badge]][travis-url]
[![Coverage Status][coveralls-badge]][coveralls-url]
[![Code Climate][codeclimate-badge]][codeclimate-url]
[![Dependency Status][david-badge]][david-url]

> **a fake redis for [node.js](https://github.com/nodejs/node)**

This module provides easy-to-use simulated instances of Redis
to which you appear to be connected via the
[redis](https://github.com/mranney/node_redis) client by [Matt Ranney](https://github.com/mranney).
**It helps with writing tests** in two ways:
your tests won't require an actual redis instance
and you'll be able to safely run as many tests in parallel as you want.

[![NPM Version](https://nodei.co/npm/fakeredis.png?downloads=true)](https://npmjs.org/package/fakeredis)


## Usage

Install:

    npm install fakeredis

You can use fakeredis as you would use node_redis,
just changing the module name from `redis` to `fakeredis`:

```javascript
var client = require("fakeredis").createClient(port, host);
```

Both parameters are optional,
and only serve to determine if you want to reuse a an existing fakeredis instance or not.
You can also just name your backends arbitrarily:

```javascript

// Create a connection to a fresh fakeredis instance:
var client = fakeredis.createClient("social stuff");

// Connect to the same backend via another simulated connection:
var concurrentClient = fakeredis.createClient("social stuff");
```

By omitting both parameters,
you simply create a new blank slate fakeredis instance:

```javascript
var client = require("fakeredis").createClient();
```


In other words,
every time you create a client specifying the same port and/or name
you reuse the same simulated backend.
This makes most sense when you need a concurrent client setup for some test,
say because you need to publish / subscribe,
or because you want to test something that's based on `MULTI`/`EXEC`
and uses optimistic locking with `WATCH`/`UNWATCH`.

In any case, fakeredis is great for testing
because you can run as many tests in parallel as you wish,
and that's also why you'll generally be naming your clients
in a way that ensures tests don't collide.

By default fakeredis simulates network latency
to help you discover race-conditions when testing multi-client setups.
Network latency can be disabled using the .fast option:

```javascript
var client = require("fakeredis").createClient(port, host, {
    fast : true
});
```

## Intended differences from a true Redis

One key difference is that the output of some commands,
such as `SMEMBERS`, `HKEYS`, `HVALS`,
comes out sorted lexicographically to provide for simpler testing.
This means that some tests that make use of undocumented Redis behaviours
such as the chronological order of retrieval for members in a set
may fail when attempted with fakeredis.
To solve this,
whenever there is no documented sort order for a given Redis command's multi-bulk reply,
sort the output before asserting equality to ensure your tests run everywhere.

Another major difference is that commands that accept modifier parameters, such as
`SORT key [BY pattern] [LIMIT offset count] [GET pattern [GET pattern ...]] [ASC|DESC] [ALPHA] [STORE destination]`
currently only accept these parameters in the order that is stated in the documentation.
For example,
in Redis it appears to be perfectly legitimate to have `SORT myset ALPHA LIMIT 0 5`,
but in fakeredis this will currently return a syntax error.

I'm totally open to discussion on both points.


### Implemented subset:

Fakeredis is still mostly stuck in the Redis 2.4 era.

All Redis 2.4 string, list, hash, set and sorted set commands,
most keyspace commands, and some connection and server commands.
Pubsub, transactions with optimistic locking are also fully implemented.

List of **available** commands:

Keyspace:

    DBSIZE
    EXISTS
    EXPIRE
    EXPIREAT
    FLUSHDB
    KEYS
    PERSIST
    DEL
    RANDOMKEY
    RENAME
    RENAMENX
    SORT
    TTL
    TYPE

Strings:

    APPEND
    BITCOUNT
    DECR
    DECRBY
    GET
    GETBIT
    GETRANGE
    GETSET
    INCR
    INCRBY
    MGET
    MSET
    MSETNX
    SET
    SETBIT
    SETEX
    SETNX
    SETRANGE

Hashes:

    HDEL
    HEXISTS
    HGET
    HGETALL
    HINCRBY
    HKEYS
    HLEN
    HMGET
    HMSET
    HSET
    HSETNX
    HVALS

Lists:

    BLPOP
    BRPOP
    BRPOPLPUSH
    LINDEX
    LINSERT
    LLEN
    LPOP
    LPUSH
    LPUSHX
    LRANGE
    LREM
    LSET
    LTRIM
    RPOP
    RPOPLPUSH
    RPUSH
    RPUSHX

Sets:

    SADD
    SCARD
    SDIFF
    SDIFFSTORE
    SINTER
    SINTERSTORE
    SISMEMBER
    SMEMBERS
    SMOVE
    SPOP
    SRANDMEMBER
    SREM
    STRLEN
    SUNION
    SUNIONSTORE

Sorted Sets:

    ZADD
    ZCARD
    ZCOUNT
    ZINCRBY
    ZINTERSTORE
    ZRANGE
    ZRANGEBYSCORE
    ZRANK
    ZREM
    ZREMRANGEBYRANK
    ZREMRANGEBYSCORE
    ZREVRANGE
    ZREVRANGEBYSCORE
    ZREVRANK
    ZSCORE
    ZUNIONSTORE

Pub/Sub:

    PSUBSCRIBE
    PUBLISH
    PUNSUBSCRIBE
    SUBSCRIBE
    UNSUBSCRIBE

Transactions:

    DISCARD
    EXEC
    MULTI
    UNWATCH
    WATCH

Connection and Server:

    ECHO
    PING
    QUIT
    SELECT

These do nothing but return `OK`:

    AUTH
    BGREWRITEAOF
    BGSAVE
    SAVE


### What's missing:

Most notably, there's no support for Lua scripting and `MONITOR` is still missing.

None of the `ready`, `connect`, `error`, `end`, `drain` and `idle`
client events are currently implemented.

List of **missing** commands (will throw upon attempt to use):

Connection and Server:

    CONFIG GET
    CONFIG SET
    CONFIG RESETSTAT
    DEBUG OBJECT
    DEBUG SEGFAULT
    FLUSHALL
    INFO
    LASTSAVE
    MONITOR
    MOVE
    OBJECT
    SHUTDOWN
    SLAVEOF
    SYNC


## License

MIT.


[npm-badge]: https://img.shields.io/npm/v/fakeredis.svg
[npm-url]: https://npmjs.com/package/fakeredis
[travis-badge]: https://api.travis-ci.org/hdachev/fakeredis.svg
[travis-url]: https://travis-ci.org/hdachev/fakeredis
[coveralls-badge]:https://coveralls.io/repos/hdachev/fakeredis/badge.svg?branch=master&service=github
[coveralls-url]: https://coveralls.io/github/hdachev/fakeredis?branch=master
[david-badge]: https://david-dm.org/hdachev/fakeredis.svg
[david-url]: https://david-dm.org/hdachev/fakeredis
[codeclimate-badge]: https://codeclimate.com/github/hdachev/fakeredis/badges/gpa.svg
[codeclimate-url]: https://codeclimate.com/github/hdachev/fakeredis