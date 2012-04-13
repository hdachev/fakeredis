

var index       = require ( "redis" ),
    Backend     = require ( "./lib/backend" ).Backend,
    Connection  = require ( "./lib/connection" ).Connection,
    helpers     = require ( "./lib/helpers" ),

    backends    = {},
    RedisClient = index.RedisClient,

    anon        = 0;


exports.createClient = function ( port, host, options )
{
    var id  = !port && !host ? 'fake_' + ( ++ anon ) : ( host || "" ) + ( port || "" ),
        c   = new Connection ( backends [ id ] || ( backends [ id ] = new Backend ) ),
        cl  = new RedisClient ( { on : function () {} } /* , options */ ),
        ns  = options && options.no_sugar,

        sc  = 0;

    cl.connected = true;
    cl.ready = true;

    cl.send_command = function ()
    {
        var command, args = [], i, n, callback;

        n = arguments.length;
        for ( i = 0; i < n; i ++ )
            args = args.concat ( arguments [ i ] );

        command = args.shift ();
        n = args.length;
        if ( typeof args [ n - 1 ] === 'function' )
            callback = args.pop ();

            ////    Inner array as last argument.

        if ( n )
            args = flattenArgs ( args );

            ////    Lint arguments.

        if ( !options || !options.no_lint )
        {
            n = args.length;
            for ( i = 0; i < n; i ++ )
                if ( typeof args [ i ] !== 'string' && typeof args [ i ] !== 'number' )
                    throw new Error ( "fakeredis/lint: Argument #" + i + " for " + command + " is not a String or Number: " + args [ i ] );
        }

            ////    You can disable hash sugar with the no_sugar option.

        if ( callback && !ns && /^hgetall/i.test ( command ) )
            cb = function ( err, data )
            {
                if ( !err && data )
                    data = reply_to_object ( data );

                callback ( err, data );
            };

        else
            cb = callback;

        c.push ( this, command, args, cb );
    };

    cl.pushMessage = cl.emit.bind ( cl );

    ( function ()
    {
        var prop;
        for ( prop in helpers )
            cl [ prop ] = helpers [ prop ];
    }
    () );

    return cl;
};


    ////    Enable instanceof checks on the redis client.

exports.RedisClient = function ()
{
    throw new Error ( "Use createClient instead." );
};


    ////    node_redis compat stuff.

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

function flattenArgs ( args )
{
    // if the last argument is an array, expand it out.  This allows commands like this:
    //     client.command(arg1, [arg2, arg3, arg4], cb);
    //  and converts to:
    //     client.command(arg1, arg2, arg3, arg4, cb);
    // which is convenient for some things like sadd
    if (args.length > 0 && Array.isArray(args[args.length - 1])) {
        args = args.slice(0, -1).concat(args[args.length - 1]);
    }

    return args;
}

