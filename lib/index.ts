import { EventEmitter } from 'events';
import { Client } from 'pg';
import { v4 } from 'uuid';

interface PoolOptionsBase {
  poolSize: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

interface PoolOptionsExplicit {
  host: string;
  database: string;
  user?: string;
  password?: string;
  port?: number;
  poolSize?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

interface PoolOptionsImplicit {
  connectionString: string;
  poolSize?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

type PoolClient = Client & {
  idleTimeoutTimer?: NodeJS.Timer;
  release: () => void;
};

class Pool extends EventEmitter {
  protected options: PoolOptionsBase & (PoolOptionsExplicit | PoolOptionsImplicit);
  protected connections: Array<PoolClient> = [];
  // Should self order by idle timeout ascending
  protected idleConnections: Array<PoolClient> = [];
  protected connectionQueue: Array<string> = [];

  constructor (options: PoolOptionsExplicit | PoolOptionsImplicit) {
    super();

    const defaultOptions: PoolOptionsBase = {
      poolSize: 10,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 30000,
    };

    this.options = {
      ...defaultOptions,
      ...options,
    };
  }

  async connect() : Promise<PoolClient> {
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
          }, this.options.connectionTimeoutMillis);
        }),
      ]);
    } finally {
      if (connectionTimeoutTimer) {
        clearTimeout(connectionTimeoutTimer);
      }
    }
  }

  private async createConnection() : Promise<PoolClient> {
    const client = <PoolClient> new Client(this.options);
    client.release = () => {
      const id = this.connectionQueue.shift();

      // Return the connection to be used by a queued request
      if (id) {
        this.emit(`connection_${id}`, client);
      } else {
        client.idleTimeoutTimer = setTimeout(() => {
          const index = this.idleConnections.indexOf(client);
          if (index > -1) {
            this.idleConnections.splice(index, 1);
            client.end().catch((ex) => {
              this.emit('error', ex);
            });
          } else {
            this.emit('error', new Error('Error closing idle connection'));
          }
        }, this.options.idleTimeoutMillis);

        this.idleConnections.push(client);
      }
    };
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
}
