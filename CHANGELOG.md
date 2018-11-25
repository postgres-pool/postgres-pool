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
