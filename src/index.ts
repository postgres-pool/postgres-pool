import { EventEmitter } from 'events';
import { Client, QueryResult } from 'pg';
import { StrictEventEmitter } from 'strict-event-emitter-types';
import { v4 } from 'uuid';

export interface PoolOptionsBase {
  poolSize: number;
  idleTimeoutMillis: number;
  waitForAvailableConnectionTimeoutMillis: number;
  connectionTimeoutMillis: number;
  reconnectOnReadOnlyTransactionError: boolean;
}

export interface PoolOptionsExplicit {
  host: string;
  database: string;
  user?: string;
  password?: string;
  port?: number;
  poolSize?: number;
  idleTimeoutMillis?: number;
  waitForAvailableConnectionTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  reconnectOnReadOnlyTransactionError?: boolean;
}

export interface PoolOptionsImplicit {
  connectionString: string;
  poolSize?: number;
  idleTimeoutMillis?: number;
  waitForAvailableConnectionTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  reconnectOnReadOnlyTransactionError?: boolean;
}

export type PoolClient = Client & {
  uniqueId: string;
  idleTimeoutTimer?: NodeJS.Timer;
  release: (removeConnection?: boolean) => void;
  errorHandler: (err: Error) => void;
};

interface PoolEvents {
  connectionRequestQueued: () => void;
  connectionRequestDequeued: () => void;
  connectionAddedToPool: () => void;
  connectionRemovedFromPool: () => void;
  connectionIdle: () => void;
  connectionRemovedFromIdlePool: () => void;
  idleConnectionActivated: () => void;
  queryDeniedForReadOnlyTransaction: () => void;
  error: (error: Error, client?: PoolClient) => void;
}

type PoolEmitter = StrictEventEmitter<EventEmitter, PoolEvents>;

export class Pool extends (EventEmitter as { new(): PoolEmitter }) {
  protected options: PoolOptionsBase & (PoolOptionsExplicit | PoolOptionsImplicit);
  // Internal event emitter used to handle queued connection requests
  protected connectionQueueEventEmitter: EventEmitter;
  protected connections: string[] = [];
  // Should self order by idle timeout ascending
  protected idleConnections: PoolClient[] = [];
  protected connectionQueue: string[] = [];
  protected isEnding: boolean = false;

  constructor (options: PoolOptionsExplicit | PoolOptionsImplicit) {
    super();

    const defaultOptions: PoolOptionsBase = {
      poolSize: 10,
      idleTimeoutMillis: 10000,
      waitForAvailableConnectionTimeoutMillis: 90000,
      connectionTimeoutMillis: 30000,
      reconnectOnReadOnlyTransactionError: false,
    };

    this.options = {
      ...defaultOptions,
      ...options,
    };

    this.connectionQueueEventEmitter = new EventEmitter();
  }

  /**
   * Gets the number of queued requests waiting for a database connection
   */
  get waitingCount(): number {
    return this.connectionQueue.length;
  }

  /**
   * Gets the number of idle connections
   */
  get idleCount(): number {
    return this.idleConnections.length;
  }

  /**
   * Gets the total number of connections in the pool
   */
  get totalCount(): number {
    return this.connections.length;
  }

  /**
   * Gets a client connection from the pool.
   * Note: You must call `.release()` when finished with the client connection object. That will release the connection back to the pool to be used by other requests.
   */
  public async connect(): Promise<PoolClient> {
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

    const id = v4();

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
          this.connectionQueueEventEmitter.on(`connection_${id}`, (client: Client) => {
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
      ]) as PoolClient;
    } finally {
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
  public async query(text: string, values?: any[]): Promise<QueryResult> {
    const connection = await this.connect();
    let removeConnection = false;
    try {
      return await connection.query(text, values);
    } catch (ex) {
      if (!this.options.reconnectOnReadOnlyTransactionError || !/cannot execute [\s\w]+ in a read-only transaction/igu.test(ex.message)) {
        throw ex;
      }

      removeConnection = true;
    } finally {
      connection.release(removeConnection);
    }

    // If we get here, that means that the query was attempted with a read-only connection.
    // This can happen when the cluster fails over to a read-replica
    this.emit('queryDeniedForReadOnlyTransaction');

    // Clear all idle connections and try the query again with a fresh connection
    for (const idleConnection of this.idleConnections) {
      this._removeConnection(idleConnection);
    }

    const connection2 = await this.connect();
    try {
      return await connection2.query(text, values);
    } finally {
      connection2.release();
    }
  }

  /**
   * Drains the pool of all active client connections. Used to shut down the pool down cleanly
   */
  public end() {
    this.isEnding = true;

    for (const idleConnection of this.idleConnections) {
      this._removeConnection(idleConnection);
    }
  }

  /**
   * Creates a new client connection to add to the pool
   * @param {string} connectionId
   */
  private async _createConnection(connectionId: string): Promise<PoolClient> {
    const client = new Client(this.options) as PoolClient;
    client.uniqueId = connectionId;
    /**
     * Releases the client connection back to the pool, to be used by another query.
     */
    client.release = (removeConnection: boolean = false) => {
      if (this.isEnding || removeConnection) {
        this._removeConnection(client);
        return;
      }

      const id = this.connectionQueue.shift();

      // Return the connection to be used by a queued request
      if (id) {
        this.connectionQueueEventEmitter.emit(`connection_${id}`, client);
      } else {
        client.idleTimeoutTimer = setTimeout(() => {
          this._removeConnection(client);
        }, this.options.idleTimeoutMillis);

        this.idleConnections.push(client);
        this.emit('connectionIdle');
      }
    };

    client.errorHandler = (err: Error) => {
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
    } catch (ex) {
      await client.end();

      throw ex;
    } finally {
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
  private _removeConnection(client: PoolClient) {
    client.removeListener('error', client.errorHandler);

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
      this.emit('error', ex);
    });

    this.emit('connectionRemovedFromPool');
  }
}
