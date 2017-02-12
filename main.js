"use strict";

// By default fakeredis simulates a ridiculous amount of network latency
// to help you discover race-conditions when testing multi-client setups.
// Instantiate your 'clients' with a truthy .fast option,
// or set it here globally to make things go a bit faster.

exports.fast = false;

var index = require("redis")
  , Backend = require("./lib/backend").Backend
  , Connection = require("./lib/connection").Connection
  , helpers = require("./lib/helpers")

  , backends = {}
  , RedisClient = index.RedisClient

  , anon = 0;


// Re-export redis exports.

exports.RedisClient = index.RedisClient;
exports.Multi = index.Multi;
exports.print = index.print;
exports.backends = backends;

// Overriden client factory.

exports.createClient = function(port, host, options) {
  if (arguments.length == 1 && typeof port == "object") { 
    options = port;
    if (options.port || options.host) {
      port = options.port;
      host = options.host;
    }
    if (options.url || options.path) { 
      host = options.url || options.path;
      port = "";
    }
  }
  var id = !port && !host ? 'fake_' + (++anon) : (host || "") + ((port) ? ":" + port : null || "")
    , lat = options && options.fast || exports.fast ? 1 : null
    , c = new Connection(backends[id] || (backends[id] = new Backend), lat, lat)
    , real_create_stream = RedisClient.prototype.create_stream
    , returnBuffers = options && options.return_buffers
    , detectBuffers = options && options.detect_buffers;

  // Mock create_stream to create a new RedisClient without creating a socket
  RedisClient.prototype.create_stream = function () {
    this.connected = true;
    this.ready = true;
  };

  var cl = new RedisClient(/* options */)

  // Replace the mocked create_stream function again with the original one
  RedisClient.prototype.create_stream = real_create_stream;

  if (options && options.verbose)
    c.verbose = true;

  cl.end = function() {
    cl.send_command = function(command) {
      throw new Error("fakeredis: You've closed this connection with .end(), cannot " + command);
    };
  };

  cl.send_command = function(command, args, callback) {

    // Interpret arguments, copy-paste from mranney/redis/index.js for best compat.
    if (typeof command !== "string") {
      throw new Error("First argument to send_command must be the command name string, not " + typeof command);
    }

    if (Array.isArray(args)) {
      if (typeof callback === "function") {
        // probably the fastest way:
        //     client.command([arg1, arg2], cb);  (straight passthrough)
        //         send_command(command, [arg1, arg2], cb);
      } else if (! callback) {
        // most people find this variable argument length form more convenient, but it uses arguments, which is slower
        //     client.command(arg1, arg2, cb);   (wraps up arguments into an array)
        //       send_command(command, [arg1, arg2, cb]);
        //     client.command(arg1, arg2);   (callback is optional)
        //       send_command(command, [arg1, arg2]);
        //     client.command(arg1, arg2, undefined);   (callback is undefined)
        //       send_command(command, [arg1, arg2, undefined]);
        var last_arg_type = typeof args[args.length - 1];
        if (last_arg_type === "function" || last_arg_type === "undefined") {
          callback = args.pop();
        }
      } else {
        throw new Error("send_command: last argument must be a callback or undefined");
      }
    } else {
      throw new Error("send_command: second argument must be an array");
    }

    // if the last argument is an array, expand it out.  This allows commands like this:
    //     client.command(arg1, [arg2, arg3, arg4], cb);
    //  and converts to:
    //     client.command(arg1, arg2, arg3, arg4, cb);
    // which is convenient for some things like sadd
    if (Array.isArray(args[args.length - 1])) {
      args = args.slice(0, - 1).concat(args[args.length - 1]);
    }


    // Arg check.

    var useBuffers = returnBuffers;
    var i, n;
    n = args.length;
    for (i = 0; i < n; i++) {
      var arg = args[i];

      // buf support
      if (Buffer.isBuffer(arg)) {
        args[i] = packageBuffer(arg);
        if (detectBuffers)
          useBuffers = true;
      }

      // lint
      else if (typeof arg !== 'string' && typeof arg !== 'number') {
        var err = new Error("fakeredis/lint: Argument #" + i + " for " + command + " is not a String, Buffer or Number: " + arg);
        if (callback)
          return callback(err);
        else
          throw err;
      }
    }


    // Callback middleware.

    if (callback) {

      // hgetall sugar
      if (/^hgetall/i.test(command))
        callback = makeReplyToObjectAdaptor(callback);

      // buffer support
      callback = makeUnpackageBuffersAdaptor(useBuffers, callback);
    }


    //

    c.push(this, command, args, callback);
  };

  cl.pushMessage = cl.emit.bind(cl);

  (function() {
    var prop;
    for (prop in helpers)
      cl[prop] = helpers[prop];
  }
  ());


  // Schedule some events.

  process.nextTick(function() {
    cl.ready = true;
    cl.emit('ready');
  });


  //
  return cl;
};


//

function makeReplyToObjectAdaptor(callback) {
  return function(err, data) {
    if (!err && data)
      data = reply_to_object(data);

    callback(err, data);
  };
}

function makeUnpackageBuffersAdaptor(returnAsBuffers, callback) {
  return function(err, data) {
    if (!err)
      data = returnAsBuffers
        ? unpackageBuffersAsObjects(data)
        : unpackageBuffersAsStrings(data);

    callback(err, data);
  };
}


// Helpers for node_redis compat.

// hgetall converts its replies to an Object.  If the reply is empty, null is returned.
function reply_to_object(reply) {
  var obj = {}, j, jl, key, val;

  if (reply.length === 0) {
    return null;
  }

  for (j = 0, jl = reply.length; j < jl; j += 2) {
    key = reply[j].toString();
    val = reply[j + 1];
    obj[key] = val;
  }

  return obj;
}


// I realize this is possibly the most idiotic way to add support for buffers.

var BUFFER_PREFIX = "\t!bUF?!1\t";

function packageBuffer(buf) {

  // If possible, try storing the buffer as a utf8 string.
  // For this to work baking the string back to a buffer must yield the exact same bytes.
  var asString = buf.toString('utf8');
  var enc = new Buffer(asString, 'utf8');
  var n = enc.length;
  if (n === buf.length) {
    var ok = true;
    while (n--)
      if (buf[n] !== enc[n]) {
        ok = false;
        break;
      }

    if (ok)
      return asString;
  }

  // If not possible, keep the buffer as a prefixed, base64 encoded string internally.
  return BUFFER_PREFIX + buf.toString('base64');
}

function unpackageBuffersAsObjects(data) {
  if (Array.isArray(data))
    return data.map(unpackageBuffersAsObjects);

  if (typeof data === 'string' && data.indexOf(BUFFER_PREFIX) === 0)
    return new Buffer(data.substr(BUFFER_PREFIX.length), 'base64');
  else if (data)
    return new Buffer(data.toString(), 'utf8');
  else
    return null;
}

function unpackageBuffersAsStrings(data) {
  if (Array.isArray(data))
    return data.map(unpackageBuffersAsStrings);

  if (typeof data === 'string' && data.indexOf(BUFFER_PREFIX) === 0)
    return new Buffer(data.substr(BUFFER_PREFIX.length), 'base64').toString('utf8');
  else
    return data;
}

