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
