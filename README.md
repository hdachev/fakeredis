

# fakeredis - a fake redis for node.js


This module provides easy-to-use simulated instances of Redis
to which you appear to be connected via the pretty much standard
[redis](https://github.com/mranney/node_redis) client by [Matt Ranney](https://github.com/mranney).
It's not meant to be persistant nor efficient,
instead it's only purpose is to help with testing systems
that do a lot of datastructure mumbo-jumbo etc,
such as high-level datastructures
like social graph implementations
or perhaps an autocomplete, etc.

Currently works by rewiring the send_command method on the RedisClient object
to push the commands to a simulated backend via a bogus connection
that does a little bit in the line of imitating pipelining and network latency,
but like - very little.



## Usage

Install:

    npm install fakeredis


You can use fakeredis as you would use node_redis,
just changing the module name from `redis` to `fakeredis`:

    var client = require ( "fakeredis" )
        .createClient ( port, host );


Both parameters are optional,
and only serve to determine if you want to reuse a an existing fakeredis instance or not:

    var redis  = require ( "fakeredis" );

        ////    Create a connection to a fresh fakeredis instance:

    var client = redis.createClient ( "social stuff" );

        ////    Connect to the same backend via another simulated connection:

    var concurrentClient = redis.createClient ( "social stuff" );


By omitting both parameters,
you simply create a new blank slate fakeredis instance:

    var client = require ( "fakeredis" )
        .createClient ();


In other words,
every time you create a client specifying the same port and/or name
you reuse the same simulated backend.
This makes most sense when you need a concurrent client setup for some test,
say because you need to publish / subscribe,
or because you want to test something that's based on `MULTI`/`EXEC`
and uses optimistic locking with `WATCH`/`UNWATCH`.

In any case, fakeredis shines over the real thing for testing
because you can run as many tests in parallel as you wish,
and that's why you'll generally be naming your clients
in a way that ensures they don't collide between tests.



## Differences from a true Redis

The only difference is that the output of some commands,
such as `SMEMBERS`, `HKEYS`, `HVALS`,
comes out sorted lexicographically to provide for simpler testing.
This means that some tests that make use of undocumented Redis behaviours
such as the chronological order of retrieval for members in a set
may fail when attempted with fakeredis.
To solve this,
whenever there is no documented sort order for a given Redis command's multi-bulk reply,
sort the output before asserting equality to ensure your tests run everywhere.


### Implemented subset:

All string, list, hash, set and sorted set commands,
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
    TTL
    TYPE

Strings:

    APPEND
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

These do nothing but return `OK`:

    AUTH
    BGREWRITEAOF
    BGSAVE
    SAVE


### What's still missing:

`SORT` and `MONITOR`.
Expect both to be implemented soon though.

Also note that **none of the node_redis client constructor options are available**,
which means no `detect_buffers` and `return_buffers`.
Command arguments are always stringified at the fake connection level,
and replies are always returned as `null`, `String`, `Number` or `Array`.

Finally,
none of the `ready`, `connect`, `error`, `end`, `drain` and `idle`
client events are currently implemented.

List of **missing** commands (will throw upon attempt to use):

Keyspace:

    SORT

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
    SELECT
    SHUTDOWN
    SLAVEOF
    SYNC



## Helpers

To facilitate development and testing,
fakeredis provides some additional methods on the client object.


### Prettyprinting:

    fakeredisClient.pretty ();
    fakeredisClient.pretty ( "p*tte?n" );
    fakeredisClient.pretty ({ label : "zsets before dbflush", pattern : "myz*" });

`.pretty()` will prettyprint to stdout the entire keyspace
or a subset of keys specificed with a redis pattern
of the same kind that's used for `KEYS` and `PSUBSCRIBE`.
Keep in mind .pretty() is async,
because it works as a normal client command
and hence needs to respect the command order,
fake pipelining and latency and all,
so that you can do stuff like:

    var fake   = require ( "fakeredis" );
    var client = fake.createClient ();

    client.SADD ( 'hello', 'world', 'Jenny', 'Sam' );
    client.LPUSH ( 'mylist', 'hey', 'ho', 'letsgo' );
    client.pretty ({ label : "my stuff" });

Which would print *(in color!)*

    my stuff:

    set     hello
    -1      Jenny,  Sam,    world

    list    mylist
    -1      letsgo, ho,     hey


### Keyspace dumps:

    fakeredisClient.getKeypsace ( callback );
    fakeredisClient.getKeypsace ( "p*tte?n", callback )
    fakeredisClient.getKeypsace ({ label : "zsets before dbflush", pattern : "myz*" }, callback );

Will callback ( err, data ) with an array
that enumerates the whole keyspace,
or the requested subset, in the following manner:

    [
        [ key1, ttl1, type1, value1 ],
        [ key2, ttl2, type2, value2 ],
        ...
    ]

The keyspace is sorted lexicographically by key,
string values are strings,
list values are the output of `LRANGE 0 -1`,
hashes come out as the output of `HGETALL` for hashes
(no syntactic sugar though, so an Array of `[ field, value, field, value, ... ]`,
`SMEMBERS` output is used for sets,
and `ZRANGE 0 -1 WITHSCORES` for sorted sets,
each of which is sorted lexicographically in a way that makes sense,
so that the final result is simple enough to assert deep equality against.



## LICENSE - "MIT License"

Fakeredis:
Copyright (c) 2012 Hristo Dachev, http://controul.com/

Original [redis](https://github.com/mranney/node_redis) client licence:
Copyright (c) 2010 Matthew Ranney, http://ranney.com/

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

