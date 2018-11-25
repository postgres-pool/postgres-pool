/// <reference types="node" />
import { EventEmitter } from 'events';
import { Client, QueryResult } from 'pg';
import { StrictEventEmitter } from 'strict-event-emitter-types';
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
interface PoolEvents {
    connectionRequestQueued: () => void;
    connectionRequestDequeued: () => void;
    connectionAddedToPool: () => void;
    connectionRemovedFromPool: () => void;
    connectionIdle: () => void;
    connectionRemovedFromIdlePool: () => void;
    idleConnectionActivated: () => void;
    error: (error: Error, client?: PoolClient) => void;
}
declare const Pool_base: new () => StrictEventEmitter<EventEmitter, PoolEvents, PoolEvents, "addEventListener" | "removeEventListener", "removeListener" | "on" | "addListener" | "once" | "emit">;
export declare class Pool extends Pool_base {
    protected options: PoolOptionsBase & (PoolOptionsExplicit | PoolOptionsImplicit);
    protected connectionQueueEventEmitter: EventEmitter;
    protected connections: string[];
    protected idleConnections: PoolClient[];
    protected connectionQueue: string[];
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
    query(text: string, values?: any[]): Promise<QueryResult>;
    /**
     * Drains the pool of all active client connections. Used to shut down the pool down cleanly
     */
    end(): Promise<void>;
    /**
     * Creates a new client connection to add to the pool
     * @param {string} connectionId
     */
    private _createConnection;
    /**
     * Removes the client connection from the pool and tries to gracefully shut it down
     * @param {PoolClient} client
     */
    private _removeConnection;
}
export {};
