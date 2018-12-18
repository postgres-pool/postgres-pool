"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const pg_1 = require("pg");
const uuid_1 = require("uuid");
class Pool extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.connections = [];
        // Should self order by idle timeout ascending
        this.idleConnections = [];
        this.connectionQueue = [];
        this.isEnding = false;
        const defaultOptions = {
            poolSize: 10,
            idleTimeoutMillis: 10000,
            waitForAvailableConnectionTimeoutMillis: 90000,
            connectionTimeoutMillis: 30000,
            reconnectOnDatabaseIsStartingError: true,
            waitForDatabaseStartupMillis: 0,
            databaseStartupTimeoutMillis: 90000,
            reconnectOnReadOnlyTransactionError: true,
            waitForReconnectReadOnlyTransactionMillis: 0,
            readOnlyTransactionReconnectTimeoutMillis: 90000,
        };
        this.options = Object.assign({}, defaultOptions, options);
        this.connectionQueueEventEmitter = new events_1.EventEmitter();
    }
    /**
     * Gets the number of queued requests waiting for a database connection
     */
    get waitingCount() {
        return this.connectionQueue.length;
    }
    /**
     * Gets the number of idle connections
     */
    get idleCount() {
        return this.idleConnections.length;
    }
    /**
     * Gets the total number of connections in the pool
     */
    get totalCount() {
        return this.connections.length;
    }
    /**
     * Gets a client connection from the pool.
     * Note: You must call `.release()` when finished with the client connection object. That will release the connection back to the pool to be used by other requests.
     */
    async connect() {
        if (this.isEnding) {
            throw new Error('Cannot use pool after calling end() on the pool');
        }
        const idleConnection = this.idleConnections.shift();
        if (idleConnection) {
            if (idleConnection.idleTimeoutTimer) {
                clearTimeout(idleConnection.idleTimeoutTimer);
            }
            this.emit('idleConnectionActivated');
            return idleConnection;
        }
        const id = uuid_1.v4();
        if (this.connections.length < this.options.poolSize) {
            this.connections.push(id);
            return await this._createConnection(id);
        }
        this.emit('connectionRequestQueued');
        this.connectionQueue.push(id);
        let connectionTimeoutTimer;
        try {
            return await Promise.race([
                new Promise((resolve) => {
                    this.connectionQueueEventEmitter.on(`connection_${id}`, (client) => {
                        this.connectionQueueEventEmitter.removeAllListeners(`connection_${id}`);
                        this.emit('connectionRequestDequeued');
                        resolve(client);
                    });
                }),
                new Promise((_, reject) => {
                    connectionTimeoutTimer = setTimeout(() => {
                        this.connectionQueueEventEmitter.removeAllListeners(`connection_${id}`);
                        const index = this.connectionQueue.indexOf(id);
                        if (index > -1) {
                            this.connectionQueue.splice(index, 1);
                        }
                        reject(new Error('Timed out while waiting for available connection in pool'));
                    }, this.options.waitForAvailableConnectionTimeoutMillis);
                }),
            ]);
        }
        finally {
            if (connectionTimeoutTimer) {
                clearTimeout(connectionTimeoutTimer);
            }
        }
    }
    /**
     * Gets a connection to the database and executes the specified query. This method will release the connection back to the pool when the query has finished.
     * @param {string} text
     * @param {Array} values
     */
    async query(text, values) {
        return this._query(text, values);
    }
    /**
     * Drains the pool of all active client connections. Used to shut down the pool down cleanly
     */
    end() {
        this.isEnding = true;
        for (const idleConnection of this.idleConnections) {
            this._removeConnection(idleConnection);
        }
    }
    async _query(text, values, readOnlyStartTime) {
        const connection = await this.connect();
        let removeConnection = false;
        let timeoutError;
        try {
            return await connection.query(text, values);
        }
        catch (ex) {
            if (this.options.reconnectOnReadOnlyTransactionError && /cannot execute [\s\w]+ in a read-only transaction/igu.test(ex.message)) {
                timeoutError = ex;
                removeConnection = true;
            }
            else {
                throw ex;
            }
        }
        finally {
            connection.release(removeConnection);
        }
        // If we get here, that means that the query was attempted with a read-only connection.
        // This can happen when the cluster fails over to a read-replica
        this.emit('queryDeniedForReadOnlyTransaction');
        // Clear all idle connections and try the query again with a fresh connection
        for (const idleConnection of this.idleConnections) {
            // tslint:disable-next-line:no-parameter-reassignment
            this._removeConnection(idleConnection);
        }
        if (!readOnlyStartTime) {
            // tslint:disable-next-line:no-parameter-reassignment
            readOnlyStartTime = process.hrtime();
        }
        if (this.options.waitForReconnectReadOnlyTransactionMillis > 0) {
            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve();
                }, this.options.waitForReconnectReadOnlyTransactionMillis);
            });
        }
        const diff = process.hrtime(readOnlyStartTime);
        const timeSinceLastRun = Number(((diff[0] * 1e3) + (diff[1] * 1e-6)).toFixed(3));
        if (timeSinceLastRun > this.options.readOnlyTransactionReconnectTimeoutMillis) {
            throw timeoutError;
        }
        return await this._query(text, values, readOnlyStartTime);
    }
    /**
     * Creates a new client connection to add to the pool
     * @param {string} connectionId
     * @param {[number,number]} [databaseStartupStartTime] - hrtime when the db was first listed as starting up
     */
    async _createConnection(connectionId, databaseStartupStartTime) {
        const client = new pg_1.Client(this.options);
        client.uniqueId = connectionId;
        /**
         * Releases the client connection back to the pool, to be used by another query.
         */
        client.release = (removeConnection = false) => {
            if (this.isEnding || removeConnection) {
                this._removeConnection(client);
                return;
            }
            const id = this.connectionQueue.shift();
            // Return the connection to be used by a queued request
            if (id) {
                this.connectionQueueEventEmitter.emit(`connection_${id}`, client);
            }
            else if (this.options.idleTimeoutMillis > 0) {
                client.idleTimeoutTimer = setTimeout(() => {
                    this._removeConnection(client);
                }, this.options.idleTimeoutMillis);
                this.idleConnections.push(client);
                this.emit('connectionIdle');
            }
            else {
                this._removeConnection(client);
            }
        };
        client.errorHandler = (err) => {
            this._removeConnection(client);
            this.emit('error', err, client);
        };
        client.on('error', client.errorHandler);
        let connectionTimeoutTimer;
        try {
            await Promise.race([
                client.connect(),
                new Promise((_, reject) => {
                    connectionTimeoutTimer = setTimeout(() => {
                        reject(new Error('Timed out trying to connect to postgres'));
                    }, this.options.connectionTimeoutMillis);
                }),
            ]);
            this.emit('connectionAddedToPool');
        }
        catch (ex) {
            if (this.options.reconnectOnDatabaseIsStartingError && /the database system is starting up/igu.test(ex.message)) {
                this.emit('waitingForDatabaseToStart');
                if (!databaseStartupStartTime) {
                    // tslint:disable-next-line:no-parameter-reassignment
                    databaseStartupStartTime = process.hrtime();
                }
                if (this.options.waitForDatabaseStartupMillis > 0) {
                    await new Promise((resolve) => {
                        setTimeout(() => {
                            resolve();
                        }, this.options.waitForDatabaseStartupMillis);
                    });
                }
                const diff = process.hrtime(databaseStartupStartTime);
                const timeSinceFirstConnectAttempt = Number(((diff[0] * 1e3) + (diff[1] * 1e-6)).toFixed(3));
                if (timeSinceFirstConnectAttempt > this.options.databaseStartupTimeoutMillis) {
                    throw ex;
                }
                return await this._createConnection(connectionId, databaseStartupStartTime);
            }
            else {
                await client.end();
                throw ex;
            }
        }
        finally {
            if (connectionTimeoutTimer) {
                clearTimeout(connectionTimeoutTimer);
            }
        }
        return client;
    }
    /**
     * Removes the client connection from the pool and tries to gracefully shut it down
     * @param {PoolClient} client
     */
    _removeConnection(client) {
        client.removeListener('error', client.errorHandler);
        // Ignore any errors when ending the connection
        // tslint:disable-next-line:no-empty
        client.on('error', () => { });
        if (client.idleTimeoutTimer) {
            clearTimeout(client.idleTimeoutTimer);
        }
        const idleConnectionIndex = this.idleConnections.findIndex((connection) => {
            return connection.uniqueId === client.uniqueId;
        });
        if (idleConnectionIndex > -1) {
            this.idleConnections.splice(idleConnectionIndex, 1);
            this.emit('connectionRemovedFromIdlePool');
        }
        const connectionIndex = this.connections.indexOf(client.uniqueId);
        if (connectionIndex > -1) {
            this.connections.splice(connectionIndex, 1);
        }
        client.end().catch((ex) => {
            if (!/This socket has been ended by the other party/igu.test(ex.message)) {
                this.emit('error', ex);
            }
        });
        this.emit('connectionRemovedFromPool');
    }
}
exports.Pool = Pool;
//# sourceMappingURL=index.js.map