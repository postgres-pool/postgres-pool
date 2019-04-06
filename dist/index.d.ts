/// <reference types="node" />
import { EventEmitter } from 'events';
import { Client, QueryResult } from 'pg';
import { StrictEventEmitter } from 'strict-event-emitter-types';
export interface PoolOptionsBase {
    /**
     * Number of connections to store in the pool
     */
    poolSize: number;
    /**
     * Milliseconds until an idle connection is closed and removed from the active connection pool
     */
    idleTimeoutMillis: number;
    /**
     * Milliseconds to wait for an available connection before throwing an error that no connection is available
     */
    waitForAvailableConnectionTimeoutMillis: number;
    /**
     * Milliseconds to wait to connect to postgres
     */
    connectionTimeoutMillis: number;
    /**
     * If connect should be retried when the database throws "the database system is starting up"
     * NOTE: This typically happens during a fail over scenario when a read-replica is being promoted to master
     */
    reconnectOnDatabaseIsStartingError: boolean;
    /**
     * Milliseconds to wait between retry connection attempts while the database is starting up. Allows you to throttle
     * how many retries should happen until databaseStartupTimeoutMillis expires. A value of 0 will
     * retry the query immediately.
     */
    waitForDatabaseStartupMillis: number;
    /**
     * If connection attempts continually return "the database system is starting up", this is the total number of milliseconds
     * to wait until an error is thrown.
     */
    databaseStartupTimeoutMillis: number;
    /**
     * If the query should be retried when the database throws "cannot execute X in a read-only transaction"
     * NOTE: This typically happens during a fail over scenario when a read-replica is being promoted to master
     */
    reconnectOnReadOnlyTransactionError: boolean;
    /**
     * Milliseconds to wait between retry queries while the connection is marked as read-only. Allows you to throttle
     * how many retries should happen until readOnlyTransactionReconnectTimeoutMillis expires. A value of 0 will
     * try reconnecting immediately.
     */
    waitForReconnectReadOnlyTransactionMillis: number;
    /**
     * If queries continually return "cannot execute X in a read-only transaction", this is the total number of
     * milliseconds to wait until an error is thrown.
     */
    readOnlyTransactionReconnectTimeoutMillis: number;
    /**
     * Specifies the regular expression to find named parameters in a query
     */
    namedParameterFindRegExp: RegExp;
    /**
     * Returns the regular expression used to replace a named parameter in a query
     */
    getNamedParameterReplaceRegExp: (namedParameter: string) => RegExp;
    /**
     * Gets the name of a named parameter without the symbols. This should correspond to the key in the query value object
     */
    getNamedParameterName: (namedParameterWithSymbols: string) => string;
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
    reconnectOnDatabaseIsStartingError?: boolean;
    waitForDatabaseStartupMillis?: number;
    databaseStartupTimeoutMillis?: number;
    reconnectOnReadOnlyTransactionError?: boolean;
    waitForReconnectReadOnlyTransactionMillis?: number;
    readOnlyTransactionReconnectTimeoutMillis?: number;
    namedParameterFindRegExp?: RegExp;
    getNamedParameterReplaceRegExp?: (namedParameter: string) => RegExp;
    getNamedParameterName?: (namedParameterWithSymbols: string) => string;
}
export interface PoolOptionsImplicit {
    connectionString: string;
    poolSize?: number;
    idleTimeoutMillis?: number;
    waitForAvailableConnectionTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    reconnectOnDatabaseIsStartingError?: boolean;
    waitForDatabaseStartupMillis?: number;
    databaseStartupTimeoutMillis?: number;
    reconnectOnReadOnlyTransactionError?: boolean;
    waitForReconnectReadOnlyTransactionMillis?: number;
    readOnlyTransactionReconnectTimeoutMillis?: number;
    namedParameterFindRegExp?: RegExp;
    getNamedParameterReplaceRegExp?: (namedParameter: string) => RegExp;
    getNamedParameterName?: (namedParameterWithSymbols: string) => string;
}
export declare type PoolClient = Client & {
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
    waitingForDatabaseToStart: () => void;
    error: (error: Error, client?: PoolClient) => void;
}
declare const Pool_base: new () => StrictEventEmitter<EventEmitter, PoolEvents, PoolEvents, "addEventListener" | "removeEventListener", "removeListener" | "on" | "addListener" | "once" | "emit">;
export declare class Pool extends Pool_base {
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
    protected options: PoolOptionsBase & (PoolOptionsExplicit | PoolOptionsImplicit);
    protected connectionQueueEventEmitter: EventEmitter;
    protected connections: string[];
    protected idleConnections: PoolClient[];
    protected connectionQueue: string[];
    protected isEnding: boolean;
    constructor(options: PoolOptionsExplicit | PoolOptionsImplicit);
    /**
     * Gets a client connection from the pool.
     * Note: You must call `.release()` when finished with the client connection object. That will release the connection back to the pool to be used by other requests.
     */
    connect(): Promise<PoolClient>;
    /**
     * Gets a connection to the database and executes the specified query using named parameters. This method will release the connection back to the pool when the query has finished.
     * @param {string} text
     * @param {Object} values - Keys represent named parameters in the query
     */
    query(text: string, values: {
        [index: string]: any;
    }): Promise<QueryResult>;
    /**
     * Gets a connection to the database and executes the specified query. This method will release the connection back to the pool when the query has finished.
     * @param {string} text
     * @param {Array} values
     */
    query(text: string, values?: any[]): Promise<QueryResult>;
    /**
     * Drains the pool of all active client connections. Used to shut down the pool down cleanly
     */
    end(): void;
    private _query;
    /**
     * Creates a new client connection to add to the pool
     * @param {string} connectionId
     * @param {[number,number]} [databaseStartupStartTime] - hrtime when the db was first listed as starting up
     */
    private _createConnection;
    /**
     * Removes the client connection from the pool and tries to gracefully shut it down
     * @param {PoolClient} client
     */
    private _removeConnection;
}
export {};
