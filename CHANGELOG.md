### 1.4.1

  * Add wildcards to dependency versions

### 1.4.0

  * Updated to typescript 3.5
  * Updated npms
  * Include type definitions as "dependencies" instead of "devDependencies"  

### 1.3.0

  * Updated to typescript 3.4
  * Updated dependencies
  * Added support for named parameters (namedParameterFindRegExp, getNamedParameterReplaceRegExp, and getNamedParameterName)
    
    Notes:

      * Named parameters are only used if an object is passed as the value parameter to the query function
        
        ```js
        myPool.query('select * from foobar where id=@id', { id: '123' });
        ```
        
      * By default, the named parameter syntax is `@parameterName`.

### 1.2.0

  * Add reconnectOnDatabaseIsStartingError (default: `true`), waitForDatabaseStartupMillis (default: `0`), and databaseStartupTimeoutMillis (default: `90000`) options for connections in pool
  * Default reconnectOnReadOnlyTransactionError to `true`
  * Add waitForReconnectReadOnlyTransactionMillis (default: `0`) and readOnlyTransactionReconnectTimeoutMillis (default: `90000`)
  * Fix unhandled error when error was thrown while attempting to end a db connection

### 1.1.0

  * Add reconnectOnReadOnlyTransactionError option for connections in pool

### 1.0.7

  * Restore firing connectionRemovedFromPool event when _removeConnection() is called

### 1.0.6

  * Fix connectionRemovedFromPool to only fire when a valid connection is removed from the pool, not each time _removeConnection() is called.
  * Add event: connectionRemovedFromIdlePool

### 1.0.5

  * Rebuild with lint updates
  * Fix query test to correctly stub _createConnection()

### 1.0.4

  * Strongly type pool events
  * Add events: connectionAddedToPool, connectionRemovedFromPool, connectionIdle, idleConnectionActivated, connectionRequestQueued, connectionRequestDequeued
  * Cleanup internal connection event listeners

### 1.0.3

  * Fix creating one extra connection over poolSize

### 1.0.2

  * Fix opening too many connections during many concurrent requests
  * Reduce memory usage

### 1.0.1

  * Call removeConnection() when ending pool

### 1.0.0

  * Initial release
