import { EventEmitter } from 'events';
import { Client, QueryResult } from 'pg';
import { v4 } from 'uuid';

export interface PoolOptionsBase {
  poolSize: number;
  idleTimeoutMillis: number;
  waitForAvailableConnectionTimeoutMillis: number;
  connectionTimeoutMillis: number;
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
}

export interface PoolOptionsImplicit {
  connectionString: string;
  poolSize?: number;
  idleTimeoutMillis?: number;
  waitForAvailableConnectionTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export type PoolClient = Client & {
  idleTimeoutTimer?: NodeJS.Timer;
  release: () => void;
};

export class Pool extends EventEmitter {
  protected options: PoolOptionsBase & (PoolOptionsExplicit | PoolOptionsImplicit);
  protected connections: Array<PoolClient> = [];
  // Should self order by idle timeout ascending
  protected idleConnections: Array<PoolClient> = [];
  protected connectionQueue: Array<string> = [];
  protected isEnding: boolean = false;

  constructor (options: PoolOptionsExplicit | PoolOptionsImplicit) {
    super();

    const defaultOptions: PoolOptionsBase = {
      poolSize: 10,
      idleTimeoutMillis: 10000,
      waitForAvailableConnectionTimeoutMillis: 90000,
      connectionTimeoutMillis: 30000,
    };

    this.options = {
      ...defaultOptions,
      ...options,
    };
  }

  /**
   * Gets the number of queued requests waiting for a database connection
   */
  get waitingCount() : number {
    return this.connectionQueue.length;
  }

  /**
   * Gets the number of idle connections
   */
  get idleCount() : number {
    return this.idleConnections.length;
  }

  /**
   * Gets the total number of connections in the pool
   */
  get totalCount() : number {
    return this.connections.length;
  }

  /**
   * Gets a client connection from the pool.
   * Note: You must call `.release()` when finished with the client connection object. That will release the connection back to the pool to be used by other requests.
   */
  async connect() : Promise<PoolClient> {
    if (this.isEnding) {
      throw new Error('Cannot use pool after calling end() on the pool');
    }

    const idleConnection = this.idleConnections.shift();
    if (idleConnection) {
      if (idleConnection.idleTimeoutTimer) {
        clearTimeout(idleConnection.idleTimeoutTimer);
      }

      return idleConnection;
    }

    if (this.connections.length <= this.options.poolSize) {
      const connection = await this.createConnection();
      this.connections.push(connection);

      return connection;
    }

    const id = v4();
    this.connectionQueue.push(id);
    let connectionTimeoutTimer;
    try {
      return <PoolClient> await Promise.race([
        new Promise((resolve) => {
          this.on(`connection_${id}`, resolve);
        }),
        new Promise((_, reject) => {
          connectionTimeoutTimer = setTimeout(() => {
            const index = this.connectionQueue.indexOf(id);
            if (index > -1) {
              this.connectionQueue.splice(index, 1);
            }
            reject(new Error('Timed out while waiting for available connection in pool'));
          }, this.options.waitForAvailableConnectionTimeoutMillis);
        }),
      ]);
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
  async query(text: string, values?: Array<any>): Promise<QueryResult> {
    const connection = await this.connect();
    try {
      return await connection.query(text, values);
    } finally {
      connection.release();
    }
  }

  /**
   * Drains the pool of all active client connections. Used to shut down the pool down cleanly
   */
  async end() {
    this.isEnding = true;

    await Promise.all(this.idleConnections.map((connection) => {
      return this.removeConnection(connection);
    }));
  }

  /**
   * Creates a new client connection to add to the pool
   */
  private async createConnection() : Promise<PoolClient> {
    const client = <PoolClient> new Client(this.options);
    /**
     * Releases the client connection back to the pool, to be used by another query.
     */
    client.release = () => {
      if (this.isEnding) {
        this.removeConnection(client);
        return;
      }

      const id = this.connectionQueue.shift();

      // Return the connection to be used by a queued request
      if (id) {
        this.emit(`connection_${id}`, client);
      } else {
        client.idleTimeoutTimer = setTimeout(() => {
          this.removeConnection(client);
        }, this.options.idleTimeoutMillis);

        this.idleConnections.push(client);
      }
    };

    client.on('error', (err) => {
      this.removeConnection(client);
      this.emit('error', err, client);
    });
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
  private removeConnection(client: PoolClient) {
    const idleConnectionIndex = this.idleConnections.indexOf(client);
    if (idleConnectionIndex > -1) {
      this.idleConnections.splice(idleConnectionIndex, 1);
    }

    const connectionIndex = this.connections.indexOf(client);
    if (connectionIndex > -1) {
      this.connections.splice(connectionIndex, 1);
    }

    client.end().catch((ex) => {
      this.emit('error', ex);
    });
  }
}
