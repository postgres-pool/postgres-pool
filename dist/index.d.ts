/// <reference types="node" />
import { EventEmitter } from 'events';
import { Client, QueryResult } from 'pg';
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
export declare type PoolClient = Client & {
    uniqueId: string;
    idleTimeoutTimer?: NodeJS.Timer;
    release: () => void;
    errorHandler: (err: Error) => void;
};
export declare class Pool extends EventEmitter {
    protected options: PoolOptionsBase & (PoolOptionsExplicit | PoolOptionsImplicit);
    protected connections: Array<string>;
    protected idleConnections: Array<PoolClient>;
    protected connectionQueue: Array<string>;
    protected isEnding: boolean;
    constructor(options: PoolOptionsExplicit | PoolOptionsImplicit);
    /**
     * Gets the number of queued requests waiting for a database connection
     */
    readonly waitingCount: number;
    /**
     * Gets the number of idle connections
     */
    readonly idleCount: number;
    /**
     * Gets the total number of connections in the pool
     */
    readonly totalCount: number;
    /**
     * Gets a client connection from the pool.
     * Note: You must call `.release()` when finished with the client connection object. That will release the connection back to the pool to be used by other requests.
     */
    connect(): Promise<PoolClient>;
    /**
     * Gets a connection to the database and executes the specified query. This method will release the connection back to the pool when the query has finished.
     * @param {string} text
     * @param {Array} values
     */
    query(text: string, values?: Array<any>): Promise<QueryResult>;
    /**
     * Drains the pool of all active client connections. Used to shut down the pool down cleanly
     */
    end(): Promise<void>;
    /**
     * Creates a new client connection to add to the pool
     * @param {string} connectionId
     */
    private createConnection(connectionId);
    /**
     * Removes the client connection from the pool and tries to gracefully shut it down
     * @param {PoolClient} client
     */
    private removeConnection(client);
}
