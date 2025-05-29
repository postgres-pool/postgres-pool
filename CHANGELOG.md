## [10.1.6](https://github.com/postgres-pool/postgres-pool/compare/v10.1.5...v10.1.6) (2025-05-29)

### Bug Fixes

- **deps:** update dependency @types/pg to v8.15.2 ([#108](https://github.com/postgres-pool/postgres-pool/issues/108)) ([c44177d](https://github.com/postgres-pool/postgres-pool/commit/c44177dde1c2247ad745b381f777c60d61ec85d0))

## [10.1.5](https://github.com/postgres-pool/postgres-pool/compare/v10.1.4...v10.1.5) (2025-05-12)

### Bug Fixes

- **deps:** update all dependencies ([#100](https://github.com/postgres-pool/postgres-pool/issues/100)) ([06925f7](https://github.com/postgres-pool/postgres-pool/commit/06925f7d4bf9f8dad5fdf65df045003c9cfe7481))
- **deps:** update all dependencies ([#104](https://github.com/postgres-pool/postgres-pool/issues/104)) ([cc3a11f](https://github.com/postgres-pool/postgres-pool/commit/cc3a11f383df7130ff2c607a3d9a36de2a298171))
- **deps:** update dependency @types/pg to v8.15.0 ([#103](https://github.com/postgres-pool/postgres-pool/issues/103)) ([20618cb](https://github.com/postgres-pool/postgres-pool/commit/20618cbd5605197b3220c1308cee482781a26f00))
- Update type definitions for pg PoolClient and for chai should assertions ([#102](https://github.com/postgres-pool/postgres-pool/issues/102)) ([bb81dca](https://github.com/postgres-pool/postgres-pool/commit/bb81dcac752d34df32f56308e646c5a28b9a5eeb))

## [10.1.4](https://github.com/postgres-pool/postgres-pool/compare/v10.1.3...v10.1.4) (2025-05-05)

### Bug Fixes

- **deps:** update all dependencies ([#93](https://github.com/postgres-pool/postgres-pool/issues/93)) ([f284c9a](https://github.com/postgres-pool/postgres-pool/commit/f284c9a37f99d6be761df8dc7025e267dd2002e9))
- **deps:** update dependency @types/pg to v8.11.14 ([#92](https://github.com/postgres-pool/postgres-pool/issues/92)) ([4cbb186](https://github.com/postgres-pool/postgres-pool/commit/4cbb18611a1b9aac7d546ebffac4d390fed14850))

## [10.1.3](https://github.com/postgres-pool/postgres-pool/compare/v10.1.2...v10.1.3) (2025-04-23)

### Bug Fixes

- **deps:** update all dependencies ([#91](https://github.com/postgres-pool/postgres-pool/issues/91)) ([48bb3ce](https://github.com/postgres-pool/postgres-pool/commit/48bb3ce520b754c34877d3f267342b2b8e714a6a))

## [10.1.2](https://github.com/postgres-pool/postgres-pool/compare/v10.1.1...v10.1.2) (2025-04-22)

### Bug Fixes

- **deps:** update dependency pg to v8.15.1 ([#89](https://github.com/postgres-pool/postgres-pool/issues/89)) ([32d6441](https://github.com/postgres-pool/postgres-pool/commit/32d6441db29d77acb54646ae9d45b2636bd284f1))

## [10.1.1](https://github.com/postgres-pool/postgres-pool/compare/v10.1.0...v10.1.1) (2025-04-15)

### Bug Fixes

- **deps:** update all dependencies ([#81](https://github.com/postgres-pool/postgres-pool/issues/81)) ([a974ff6](https://github.com/postgres-pool/postgres-pool/commit/a974ff696878c6155eafd0390640892917a151d6))
- **deps:** update dependency @types/pg to v8.11.13 ([#84](https://github.com/postgres-pool/postgres-pool/issues/84)) ([2d7dd11](https://github.com/postgres-pool/postgres-pool/commit/2d7dd11de502d76a162ccd72b47bac2e0b4a5d7d))
- optional scope for semantic release ([#86](https://github.com/postgres-pool/postgres-pool/issues/86)) ([9fac2a1](https://github.com/postgres-pool/postgres-pool/commit/9fac2a1b00482346b7290d778119e17ee44016ca))

# [10.1.0](https://github.com/postgres-pool/postgres-pool/compare/v10.0.1...v10.1.0) (2025-04-07)

### Bug Fixes

- **deps:** pin dependencies ([#75](https://github.com/postgres-pool/postgres-pool/issues/75)) ([47785ab](https://github.com/postgres-pool/postgres-pool/commit/47785abfe3f744444fdfaca55945233c4fe1efde))
- Fix lint issues with nullish coalescing operator ([22bd45b](https://github.com/postgres-pool/postgres-pool/commit/22bd45b8db18073409abece31f54835d6fb51064))

### Features

- export cert and use over fs ([#74](https://github.com/postgres-pool/postgres-pool/issues/74)) ([b9847b3](https://github.com/postgres-pool/postgres-pool/commit/b9847b3449e7a2887ad73a0aefdaa79183608472))

# 10.0.1 - 2024-03-11

- Fix loading aws certs for ESM

# 10.0.0 - 2024-03-10

- Drop support for Node.js 18
- Update npms

# 9.0.6 - 2024-01-08

- Update npms

# 9.0.5 - 2024-12-17

- Update npms
- Use node protocol for built-in modules

# 9.0.4 - 2024-11-29

- Update npms

# 9.0.3 - 2024-09-30

- Update npms

# 9.0.2 - 2024-08-26

- Update npms

# 9.0.1 - 2024-07-02

- Include certs in npm package

# 9.0.0 - 2024-07-02

- Publish as CJS and ESM
- Update npms

## BREAKING CHANGES

- `ErrorWithCode` renamed to `PostgresPoolError`

# 8.1.6 - 2024-05-13

- Update npms

# 8.1.5 - 2024-04-08

- Update npms

# 8.1.4 - 2024-03-11

- Update npms

# 8.1.3 - 2024-02-07

- Update npms

# 8.1.2 - 2024-01-05

- Update npms

# 8.1.1 - 2023-11-28

- Update npms

# 8.1.0 - 2023-10-27

- Update npms
- Update AWS TLS to use the updated global bundle for all regions.

  NOTE: `certs/rds-ca-2019-root.pem` is deprecated and will be removed in a future release.

# 8.0.0 - 2023-10-03

## BREAKING CHANGES (8.0.0)

- Drop support for Node.js 16

## NON-BREAKING CHANGES (8.0.0)

- Add `drainIdleConnections()`. Fix #67
- Update npms

# 7.0.2 - 2023-07-18

- Update npms

# 7.0.1 - 2023-04-17

- Update npms

# 7.0.0 - 2023-02-07

## BREAKING CHANGES (7.0.0)

- Drop support for Node.js 14
- Change connection timeout default from 30s to 5s

## BUG FIXES (7.0.0)

- Fix retry connection on timeout

## MAINTENANCE (7.0.0)

- Update npms

# 6.0.8 - 2023-01-13

- Update npms

# 6.0.7 - 2022-12-06

- Update npms

# 6.0.6 - 2022-11-03

- Update npms

# 6.0.5 - 2022-10-11

- Update npms

# 6.0.4 - 2022-08-30

- Update npms

# 6.0.3 - 2022-06-29

- Update npms

# 6.0.2 - 2022-06-15

- Remove lodash dependency. Fix #63 Thanks @furiozo-ga!
- Update npms

# 6.0.1 - 2022-06-05

- Fix query with object. Fix #62 Thanks @furiozo-ga!
- Update npms

# 6.0.0 - 2022-05-23

- Drop support for Node.js 12
- Update npms

# 5.0.15 - 2022-04-13

- Update npms

# 5.0.14 - 2022-03-22

- Update npms

# 5.0.13 - 2022-03-15

- Update npms

# 5.0.12 - 2022-03-02

- Restore `any` in `query()` definition

# 5.0.11 - 2022-03-02

- Fix query incorrectly throwing error with empty parameter object. Thanks @tyler-neal!
- Update npms

# 5.0.10 - 2022-02-22

- Update npms

# 5.0.9 - 2021-12-27

- Update npms

# 5.0.8 - 2021-11-16

- Update npms

# 5.0.7 - 2021-10-29

- Update npms
- Format markdown files

# 5.0.6 - 2021-09-14

- Update npms
- Lint markdown files

# 5.0.5

- Update npms
- Set sourceRoot when transpiling Typescript, to help with sourcemap paths

# 5.0.4

- Update npms

# 5.0.3

- Update npms

# 5.0.2

- Enable typescript lint checks: [`noPropertyAccessFromIndexSignature`](https://www.typescriptlang.org/tsconfig#noPropertyAccessFromIndexSignature),
  [`noUncheckedIndexedAccess`](https://www.typescriptlang.org/tsconfig#noUncheckedIndexedAccess),
  and [`noImplicitOverride`](https://www.typescriptlang.org/tsconfig#noImplicitOverride)
- Update npms

# 5.0.1

- Update npms
- Add Node.js v16 to CI tests

# 5.0.0

- Drop support for Node.js 10
- Add parameters to `connectionAddedToPool` event

# 4.0.0

- Make `end()` return a promise. #57 Thanks @Kristof-Mattei!
- Add package-lock.json. #58 Thanks @Kristof-Mattei!

# 3.2.8

- Fix `end()` not correctly closing multiple idle connections. Thanks @Kristof-Mattei!
- Update npms

# 3.2.7

- Update npms

# 3.2.6

- Update npms

# 3.2.5

- Update npms

# 3.2.4

- Update npms

# 3.2.3

- Update npms

# 3.2.2

- Update npms
- Add EAI_AGAIN as error code to trigger retry
- For `ssl: 'aws-rds'`, set `ca` to buffer instead of converting to string

# 3.2.1

- Format code with prettier

# 3.2.0

- Add options to retry connection on error (eg. ENOTFOUND)
- Update npms

# 3.1.4

- Update npms

# 3.1.3

- Update npms

# 3.1.2

- Update npms

# 3.1.1

- Update Typescript npm

# 3.1.0

- Update npms

# 3.0.0

- Update AWS TLS to use rds-ca-2019-root.pem root certificate

# 2.1.1

- Update npms

# 2.1.0

- Add settings for connection errors during queries and ability to reconnect:
  - Pool options:
    - `reconnectOnConnectionError` - true
    - `waitForReconnectConnectionMillis` - 0ms
    - `connectionReconnectTimeoutMillis` - 90,000ms
  - Event: `queryDeniedForConnectionError`
- Update npms

# 2.0.5

- Fix a pool connection not being released when connect timed out
- Include list of differences from pg-pool in README
- Update npms

# 2.0.4

- Support query_timeout and statement_timeout pg.Client config settings

# 2.0.3

- Update npms
- Make typescript lint rules more strict

# 2.0.2

- Add ssl typings to pool constructor options
- Add 'aws-rds' ssl shorthand for secure RDS TLS settings

# 2.0.1

- Move to <https://github.com/postgres-pool/postgres-pool>
- Update npms

# 2.0.0

- Drop node 8 support
- Update npms
- Clear pool connection timeout timer immediately after getting connection from pool
- Clear connection timeout timer immediately after successful connect()
- Try to destroy socket connection before calling client.end() on connection error

# 1.4.1

- Add wildcards to dependency versions

# 1.4.0

- Updated to typescript 3.5
- Updated npms
- Include type definitions as "dependencies" instead of "devDependencies"

# 1.3.0

- Updated to typescript 3.4
- Updated dependencies
- Added support for named parameters (namedParameterFindRegExp, getNamedParameterReplaceRegExp, and getNamedParameterName)

  Notes:

  - Named parameters are only used if an object is passed as the value parameter to the query function

    ```js
    myPool.query('select * from foobar where id=@id', { id: '123' });
    ```

  - By default, the named parameter syntax is `@parameterName`.

# 1.2.0

- Add reconnectOnDatabaseIsStartingError (default: `true`), waitForDatabaseStartupMillis (default: `0`), and databaseStartupTimeoutMillis (default: `90000`) options for connections in pool
- Default reconnectOnReadOnlyTransactionError to `true`
- Add waitForReconnectReadOnlyTransactionMillis (default: `0`) and readOnlyTransactionReconnectTimeoutMillis (default: `90000`)
- Fix unhandled error when error was thrown while attempting to end a db connection

# 1.1.0

- Add reconnectOnReadOnlyTransactionError option for connections in pool

# 1.0.7

- Restore firing connectionRemovedFromPool event when \_removeConnection() is called

# 1.0.6

- Fix connectionRemovedFromPool to only fire when a valid connection is removed from the pool, not each time \_removeConnection() is called.
- Add event: connectionRemovedFromIdlePool

# 1.0.5

- Rebuild with lint updates
- Fix query test to correctly stub \_createConnection()

# 1.0.4

- Strongly type pool events
- Add events: connectionAddedToPool, connectionRemovedFromPool, connectionIdle, idleConnectionActivated, connectionRequestQueued, connectionRequestDequeued
- Cleanup internal connection event listeners

# 1.0.3

- Fix creating one extra connection over poolSize

# 1.0.2

- Fix opening too many connections during many concurrent requests
- Reduce memory usage

# 1.0.1

- Call removeConnection() when ending pool

# 1.0.0

- Initial release
