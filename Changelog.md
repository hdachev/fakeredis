Changelog
=========

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
