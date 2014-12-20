Changelog
=========

## v0.3.0 - December 20, 2014

* SCAN, SSCAN, HSCAN, ZSCAN
* Bugfix: correct response formatting for zeros in bulk replies

## v0.2.2 - November 21, 2014

* Bugfix: WATCH for keys that do not yet exist.

## v0.2.1 - August 22, 2014

* Added extended SET parameters [EX/PX/NX/XX]

## v0.2.0 - April 25, 2014

* Support for `detect_buffers` and `return_buffers`.

## v0.1.5 - April 22, 2014

* Bugfix: client.end() throws.

## v0.1.3 - November 23, 2013

* Bugfix: LREM 0 did nothing, must remove all matching elements.

## v0.1.2 - November 14, 2013

* Support for SELECT.

## v0.1.1 - February 25, 2013

* You can now opt out of the excessive fake client latency.

## v0.1.0 - February 23, 2013

* Compatibility with node_redis >= 0.8
* Bugfix: LREM throws against nonexisting keys.
* Bugfix: toString() is globally polluted.
