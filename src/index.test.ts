import assert from 'node:assert';
import { setTimeout } from 'node:timers/promises';

import { faker } from '@faker-js/faker';
import pg from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { Pool, type PoolClient } from './index.js';

describe('postgres-pool', () => {
  describe('#constructor()', () => {
    it('should pass connectionString to client', async () => {
      const connectSpy = vi.spyOn(pg.Client.prototype, 'connect').mockResolvedValue(undefined);

      const connectionString = 'postgres://foo:bar@baz:1234/xur';
      const pool = new Pool({
        connectionString,
      });

      await pool.connect();

      expect(connectSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('#connect()', () => {
    it('should throw if connecting exceeds connectionTimeoutMillis', async () => {
      vi.spyOn(pg.Client.prototype, 'connect').mockReturnValue(setTimeout(10000) as never);
      vi.spyOn(pg.Client.prototype, 'end').mockResolvedValue(undefined);

      const pool = new Pool({
        connectionString: 'postgres://foo:bar@baz:1234/xur',
        connectionTimeoutMillis: 1,
        retryConnectionMaxRetries: 1,
      });

      await expect(pool.connect()).rejects.toThrow('Timed out trying to connect to postgres');
    });

    it('should call end() if timeout during connecting', async () => {
      vi.spyOn(pg.Client.prototype, 'connect').mockReturnValue(setTimeout(10000) as never);
      const endSpy = vi.spyOn(pg.Client.prototype, 'end').mockResolvedValue(undefined);

      const pool = new Pool({
        connectionString: 'postgres://foo:bar@baz:1234/xur',
        connectionTimeoutMillis: 1,
        retryConnectionMaxRetries: 0,
      });

      await expect(pool.connect()).rejects.toThrow('Timed out trying to connect to postgres');

      expect(endSpy).toHaveBeenCalledTimes(1);
    });

    it('should not consume a pool connection when connecting times out - timeout expired', async () => {
      vi.spyOn(pg.Client.prototype, 'connect').mockImplementation(() => {
        throw new Error('timeout expired');
      });
      vi.spyOn(pg.Client.prototype, 'end').mockResolvedValue(undefined);

      const pool = new Pool({
        connectionString: 'postgres://foo:bar@baz:1234/xur',
        connectionTimeoutMillis: 250,
        retryConnectionMaxRetries: 1,
      });

      await expect(pool.connect()).rejects.toThrow('timeout expired');

      expect(pool.waitingCount).toBe(0);
      expect(pool.idleCount).toBe(0);
      expect(pool.totalCount).toBe(0);
    });

    it('should not consume a pool connection when connecting times out - ERR_PG_CONNECT_TIMEOUT', async () => {
      vi.spyOn(pg.Client.prototype, 'connect').mockReturnValue(setTimeout(10000) as never);
      vi.spyOn(pg.Client.prototype, 'end').mockResolvedValue(undefined);

      const pool = new Pool({
        connectionString: 'postgres://foo:bar@baz:1234/xur',
        connectionTimeoutMillis: 1,
        retryConnectionMaxRetries: 1,
      });

      await expect(pool.connect()).rejects.toThrow('Timed out trying to connect to postgres');

      expect(pool.waitingCount).toBe(0);
      expect(pool.idleCount).toBe(0);
      expect(pool.totalCount).toBe(0);
    });

    it('should emit "connectionAddedToPool" after successful connection', async () => {
      const startTime = process.hrtime.bigint();
      let connectionStartTime: bigint | undefined;
      vi.spyOn(pg.Client.prototype, 'connect').mockReturnValue(setTimeout(1) as never);
      vi.spyOn(pg.Client.prototype, 'end').mockResolvedValue(undefined);

      const pool = new Pool({
        connectionString: 'postgres://foo:bar@baz:1234/xur',
      });
      pool.on('connectionAddedToPool', (params) => {
        connectionStartTime = params.startTime;
      });

      await pool.connect();

      assert(connectionStartTime);
      expect(connectionStartTime).toBeGreaterThan(startTime);
    });

    it('should not emit "connectionAddedToPool" if connection fails', async () => {
      const connectionAddedToPoolCalled = false;
      vi.spyOn(pg.Client.prototype, 'connect').mockReturnValue(setTimeout(10000) as never);
      vi.spyOn(pg.Client.prototype, 'end').mockResolvedValue(undefined);

      const pool = new Pool({
        connectionString: 'postgres://foo:bar@baz:1234/xur',
        connectionTimeoutMillis: 1,
      });

      await expect(pool.connect()).rejects.toThrow('Timed out trying to connect to postgres');

      expect(connectionAddedToPoolCalled).toBe(false);
    });

    it('should retry connection if client throws "timeout expired" on first attempt', async () => {
      const connectSpy = vi
        .spyOn(pg.Client.prototype, 'connect')
        .mockImplementationOnce(() => {
          throw new Error('timeout expired');
        })
        .mockResolvedValue(undefined);
      vi.spyOn(pg.Client.prototype, 'end').mockResolvedValue(undefined);

      const pool = new Pool({
        connectionString: 'postgres://foo:bar@baz:1234/xur',
        connectionTimeoutMillis: 250,
      });

      await pool.connect();

      expect(connectSpy).toHaveBeenCalledTimes(2);

      expect(pool.waitingCount).toBe(0);
      expect(pool.idleCount).toBe(0);
      expect(pool.totalCount).toBe(1);
    });

    it('should retry connection if ERR_PG_CONNECT_TIMEOUT is thrown on first attempt', async () => {
      const connectSpy = vi
        .spyOn(pg.Client.prototype, 'connect')
        .mockReturnValueOnce(setTimeout(10000) as never)
        .mockResolvedValue(undefined);

      vi.spyOn(pg.Client.prototype, 'end').mockResolvedValue(undefined);

      const pool = new Pool({
        connectionString: 'postgres://foo:bar@baz:1234/xur',
        connectionTimeoutMillis: 250,
      });
      await pool.connect();

      expect(connectSpy).toHaveBeenCalledTimes(2);

      expect(pool.waitingCount).toBe(0);
      expect(pool.idleCount).toBe(0);
      expect(pool.totalCount).toBe(1);
    });

    describe('retryQueryWhenDatabaseIsStarting', () => {
      it('should not try to reconnect if reconnectOnDatabaseIsStartingError=false and "the database system is starting up" is thrown', async () => {
        const pool = new Pool({
          connectionString: 'postgres://foo:bar@baz:1234/xur',
          reconnectOnDatabaseIsStartingError: false,
        });
        const connectSpy = vi.spyOn(pg.Client.prototype, 'connect').mockImplementation(() => {
          throw new Error('the database system is starting up');
        });

        await expect(pool.query('foo')).rejects.toThrow('the database system is starting up');

        expect(connectSpy).toHaveBeenCalledTimes(1);
      });

      it('should not try to query again if reconnectOnDatabaseIsStartingError=true and random error is thrown', async () => {
        const pool = new Pool({
          connectionString: 'postgres://foo:bar@baz:1234/xur',
          reconnectOnDatabaseIsStartingError: true,
        });
        const connectSpy = vi.spyOn(pg.Client.prototype, 'connect').mockImplementation(() => {
          throw new Error('Some other error');
        });

        await expect(pool.query('foo')).rejects.toThrow('Some other error');

        expect(connectSpy).toHaveBeenCalledTimes(1);
      });

      it('should not try to query again if reconnectOnDatabaseIsStartingError=true and no error is thrown', async () => {
        const pool = new Pool({
          connectionString: 'postgres://foo:bar@baz:1234/xur',
          reconnectOnDatabaseIsStartingError: true,
          idleTimeoutMillis: 0,
        });
        const returnResult = {
          rows: [42],
          rowCount: 1,
        };
        const connectSpy = vi.spyOn(pg.Client.prototype, 'connect').mockResolvedValue(undefined);
        const querySpy = vi.spyOn(pg.Client.prototype, 'query').mockResolvedValue(returnResult as never);
        const endSpy = vi.spyOn(pg.Client.prototype, 'end').mockResolvedValue(undefined);

        const result = await pool.query('foo');
        expect(result).toStrictEqual(returnResult);

        expect(connectSpy).toHaveBeenCalledTimes(1);
        expect(querySpy).toHaveBeenCalledTimes(1);
        expect(endSpy).toHaveBeenCalledTimes(1);
      });

      it('should try connecting again if reconnectOnDatabaseIsStartingError=true and "the database system is starting up" is thrown', async () => {
        const pool = new Pool({
          connectionString: 'postgres://foo:bar@baz:1234/xur',
          reconnectOnDatabaseIsStartingError: true,
          waitForDatabaseStartupMillis: 5,
          idleTimeoutMillis: 0,
        });
        const returnResult = {
          rows: [42],
          rowCount: 1,
        };
        const connectSpy = vi
          .spyOn(pg.Client.prototype, 'connect')
          .mockImplementationOnce(() => {
            throw new Error('the database system is starting up');
          })
          .mockResolvedValue(undefined);
        const querySpy = vi.spyOn(pg.Client.prototype, 'query').mockResolvedValue(returnResult as never);
        const endSpy = vi.spyOn(pg.Client.prototype, 'end').mockResolvedValue(undefined);

        const result = await pool.query('foo');
        expect(result).toStrictEqual(returnResult);

        expect(connectSpy).toHaveBeenCalledTimes(2);
        expect(querySpy).toHaveBeenCalledTimes(1);
        expect(endSpy).toHaveBeenCalledTimes(2);
      });

      it('should try connecting immediately if reconnectOnDatabaseIsStartingError=true and "the database system is starting up" is thrown and waitForDatabaseStartupMillis=0', async () => {
        const pool = new Pool({
          connectionString: 'postgres://foo:bar@baz:1234/xur',
          reconnectOnDatabaseIsStartingError: true,
          waitForDatabaseStartupMillis: 0,
          idleTimeoutMillis: 0,
        });
        const returnResult = {
          rows: [42],
          rowCount: 1,
        };
        const connectSpy = vi
          .spyOn(pg.Client.prototype, 'connect')
          .mockImplementationOnce(() => {
            throw new Error('the database system is starting up');
          })
          .mockResolvedValue(undefined);
        const querySpy = vi.spyOn(pg.Client.prototype, 'query').mockResolvedValue(returnResult as never);
        const endSpy = vi.spyOn(pg.Client.prototype, 'end').mockResolvedValue(undefined);

        const result = await pool.query('foo');
        expect(result).toStrictEqual(returnResult);

        expect(connectSpy).toHaveBeenCalledTimes(2);
        expect(querySpy).toHaveBeenCalledTimes(1);
        expect(endSpy).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('#query()', () => {
    it('should get a connection from the pool and release the connection after the query', async () => {
      const pool = new Pool({
        connectionString: 'postgres://foo:bar@baz:1234/xur',
      });
      const expectedResult = faker.string.uuid();
      const queryMock = vi.fn().mockResolvedValue(expectedResult);
      const releaseMock = vi.fn().mockResolvedValue(undefined);
      const connection = {
        query: queryMock,
        release: releaseMock,
      } as unknown as PoolClient;
      const connectSpy = vi.spyOn(pool, 'connect').mockResolvedValue(connection);

      const result = await pool.query('foo');

      expect(connectSpy).toHaveBeenCalledTimes(1);
      expect(queryMock).toHaveBeenCalledTimes(1);
      expect(releaseMock).toHaveBeenCalledTimes(1);

      expect(result).toBe(expectedResult);
    });

    it('should release the connection if the query throws', async () => {
      const pool = new Pool({
        connectionString: 'postgres://foo:bar@baz:1234/xur',
      });
      const queryMock = vi.fn().mockImplementation(() => {
        throw new Error('query error');
      });
      const releaseMock = vi.fn().mockResolvedValue(undefined);
      const connection = {
        query: queryMock,
        release: releaseMock,
      } as unknown as PoolClient;
      const connectSpy = vi.spyOn(pool, 'connect').mockResolvedValue(connection);

      await expect(pool.query('foo')).rejects.toThrow('query error');

      expect(connectSpy).toHaveBeenCalledTimes(1);
      expect(queryMock).toHaveBeenCalledTimes(1);
      expect(releaseMock).toHaveBeenCalledTimes(1);
    });

    it('should limit total connections based on poolSize', async () => {
      const poolSize = 2;
      const pool = new Pool({
        connectionString: 'postgres://foo:bar@baz:1234/xur',
        poolSize,
        waitForAvailableConnectionTimeoutMillis: 1,
      });
      // @ts-expect-error - Connections is protected
      expect(pool.connections.length).toBe(0);

      const expectedResult = faker.string.uuid();
      const connection = {
        uniqueId: faker.string.uuid(),
        query: vi.fn().mockResolvedValue(expectedResult),
        release: vi.fn().mockResolvedValue(undefined),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessing private method
      vi.spyOn(pool as any, '_createConnection').mockReturnValue(connection);

      try {
        await Promise.all([pool.query('query - 1'), pool.query('query - 2'), pool.query('query - 3'), pool.query('query - 4')]);
      } catch {
        // ignore
      }

      // @ts-expect-error - Connections is protected
      expect(pool.connections.length).toBe(poolSize);
    });

    describe('retryQueryWhenDatabaseIsStarting', () => {
      it('should not try connecting again if retryQueryWhenDatabaseIsStarting=false and "cannot execute X in a read-only transaction" is thrown', async () => {
        const pool = new Pool({
          connectionString: 'postgres://foo:bar@baz:1234/xur',
          reconnectOnReadOnlyTransactionError: false,
        });
        const queryMock = vi.fn().mockImplementation(() => {
          throw new Error('cannot execute UPDATE in a read-only transaction');
        });
        const releaseMock = vi.fn().mockResolvedValue(undefined);
        const connection = {
          query: queryMock,
          release: releaseMock,
        } as unknown as PoolClient;
        const connectSpy = vi.spyOn(pool, 'connect').mockResolvedValue(connection);

        await expect(pool.query('foo')).rejects.toThrow('cannot execute UPDATE in a read-only transaction');

        expect(connectSpy).toHaveBeenCalledTimes(1);
        expect(queryMock).toHaveBeenCalledTimes(1);
        expect(releaseMock).toHaveBeenCalledTimes(1);
      });

      it('should not try connecting again if reconnectOnReadOnlyTransactionError=true and non-read-only transaction error is thrown', async () => {
        const pool = new Pool({
          connectionString: 'postgres://foo:bar@baz:1234/xur',
          reconnectOnReadOnlyTransactionError: true,
        });
        const queryMock = vi.fn().mockImplementation(() => {
          throw new Error('Some other error');
        });
        const releaseMock = vi.fn().mockResolvedValue(undefined);
        const connection = {
          query: queryMock,
          release: releaseMock,
        } as unknown as PoolClient;
        const connectSpy = vi.spyOn(pool, 'connect').mockResolvedValue(connection);

        await expect(pool.query('foo')).rejects.toThrow('Some other error');

        expect(connectSpy).toHaveBeenCalledTimes(1);
        expect(queryMock).toHaveBeenCalledTimes(1);
        expect(releaseMock).toHaveBeenCalledTimes(1);
      });

      it('should not try connecting again if reconnectOnReadOnlyTransactionError=true and no error is thrown', async () => {
        const pool = new Pool({
          connectionString: 'postgres://foo:bar@baz:1234/xur',
          reconnectOnReadOnlyTransactionError: true,
        });
        const returnResult = {
          rows: [42],
          rowCount: 1,
        };
        const queryMock = vi.fn().mockResolvedValue(returnResult);
        const releaseMock = vi.fn().mockResolvedValue(undefined);
        const connection = {
          query: queryMock,
          release: releaseMock,
        } as unknown as PoolClient;
        const connectSpy = vi.spyOn(pool, 'connect').mockResolvedValue(connection);

        const result = await pool.query('foo');
        expect(result).toStrictEqual(returnResult);

        expect(connectSpy).toHaveBeenCalledTimes(1);
        expect(queryMock).toHaveBeenCalledTimes(1);
        expect(releaseMock).toHaveBeenCalledTimes(1);
      });

      it('should try connecting again if reconnectOnReadOnlyTransactionError=true and "cannot execute X in a read-only transaction" is thrown', async () => {
        const pool = new Pool({
          connectionString: 'postgres://foo:bar@baz:1234/xur',
          reconnectOnReadOnlyTransactionError: true,
          waitForReconnectReadOnlyTransactionMillis: 5,
        });
        const returnResult = {
          rows: [42],
          rowCount: 1,
        };
        const queryMock = vi
          .fn()
          .mockImplementationOnce(() => {
            throw new Error('cannot execute CREATE in a read-only transaction');
          })
          .mockResolvedValueOnce(returnResult);
        const releaseMock = vi.fn().mockResolvedValue(undefined);
        const connection = {
          query: queryMock,
          release: releaseMock,
        } as unknown as PoolClient;
        const connectSpy = vi.spyOn(pool, 'connect').mockResolvedValue(connection);

        const result = await pool.query('foo');
        expect(result).toStrictEqual(returnResult);

        expect(connectSpy).toHaveBeenCalledTimes(2);
        expect(queryMock).toHaveBeenCalledTimes(2);
        expect(releaseMock).toHaveBeenCalledTimes(2);
      });

      it('should try connecting immediately if reconnectOnReadOnlyTransactionError=true and "cannot execute X in a read-only transaction" is thrown and waitForReconnectReadOnlyTransactionMillis=0', async () => {
        const pool = new Pool({
          connectionString: 'postgres://foo:bar@baz:1234/xur',
          reconnectOnReadOnlyTransactionError: true,
          waitForReconnectReadOnlyTransactionMillis: 0,
        });
        const returnResult = {
          rows: [42],
          rowCount: 1,
        };
        const queryMock = vi
          .fn()
          .mockImplementationOnce(() => {
            throw new Error('cannot execute CREATE in a read-only transaction');
          })
          .mockResolvedValueOnce(returnResult);
        const releaseMock = vi.fn().mockResolvedValue(undefined);
        const connection = {
          query: queryMock,
          release: releaseMock,
        } as unknown as PoolClient;
        const connectSpy = vi.spyOn(pool, 'connect').mockResolvedValue(connection);

        const result = await pool.query('foo');
        expect(result).toStrictEqual(returnResult);

        expect(connectSpy).toHaveBeenCalledTimes(2);
        expect(queryMock).toHaveBeenCalledTimes(2);
        expect(releaseMock).toHaveBeenCalledTimes(2);
      });
    });

    describe('Named Parameters', () => {
      it('should convert a query with named parameters to pg query syntax', async () => {
        // NOTE: This checks for:
        // * Multiple uses of the same named parameter
        // * Object key order being different than token location in the query
        // * A named parameter that equals the substring of another named parameter
        // * A named parameter as the last token in the query (no space etc after the named parameter)

        const pool = new Pool({
          connectionString: 'postgres://foo:bar@baz:1234/xur',
        });
        const expectedResult = faker.string.uuid();
        const queryMock = vi.fn().mockResolvedValue(expectedResult);
        const releaseMock = vi.fn().mockResolvedValue(undefined);
        const connection = {
          query: queryMock,
          release: releaseMock,
        } as unknown as PoolClient;
        vi.spyOn(pool, 'connect').mockResolvedValue(connection);

        await pool.query('select foo from foobar where id=@id and (bar=@foobar or bar=@foo) and foo=@foo', {
          id: 'lorem',
          foo: 'lorem - foo',
          foobar: 'lorem - foobar',
          unused: 'lorem - unused',
        });

        expect(queryMock).toHaveBeenCalledWith('select foo from foobar where id=$1 and (bar=$2 or bar=$3) and foo=$3', ['lorem', 'lorem - foobar', 'lorem - foo']);
      });

      it('should throw if a named parameter is specified in the query string but not present in the query object', () => {
        const pool = new Pool({
          connectionString: 'postgres://foo:bar@baz:1234/xur',
        });
        const queryMock = vi.fn();
        const releaseMock = vi.fn();
        const connection = {
          query: queryMock,
          release: releaseMock,
        } as unknown as PoolClient;
        const connectSpy = vi.spyOn(pool, 'connect').mockResolvedValue(connection);

        expect(() =>
          pool.query('select * from foobar where id=@id', {
            unused: 'lorem - unused',
          }),
        ).toThrow('Missing query parameter(s): id');

        expect(connectSpy).not.toHaveBeenCalled();
        expect(queryMock).not.toHaveBeenCalled();
        expect(releaseMock).not.toHaveBeenCalled();
      });

      it('should ignore a query with named parameters if the query object is an array', async () => {
        const pool = new Pool({
          connectionString: 'postgres://foo:bar@baz:1234/xur',
        });
        const expectedResult = faker.string.uuid();
        const queryMock = vi.fn().mockResolvedValue(expectedResult);
        const releaseMock = vi.fn().mockResolvedValue(undefined);
        const connection = {
          query: queryMock,
          release: releaseMock,
        } as unknown as PoolClient;
        vi.spyOn(pool, 'connect').mockResolvedValue(connection);

        await pool.query('select foo from foobar where foo=@foo', [
          {
            foo: 'lorem - foo',
          },
        ]);

        expect(queryMock).toHaveBeenCalledWith('select foo from foobar where foo=@foo', [
          {
            foo: 'lorem - foo',
          },
        ]);
      });

      it('should ignore a query with named parameters if the query object is undefined', async () => {
        const pool = new Pool({
          connectionString: 'postgres://foo:bar@baz:1234/xur',
        });
        const expectedResult = faker.string.uuid();
        const queryMock = vi.fn().mockResolvedValue(expectedResult);
        const releaseMock = vi.fn().mockResolvedValue(undefined);
        const connection = {
          query: queryMock,
          release: releaseMock,
        } as unknown as PoolClient;
        vi.spyOn(pool, 'connect').mockResolvedValue(connection);

        await pool.query('select foo from foobar where foo=@foo');

        expect(queryMock.mock.calls[0]![0]).toBe('select foo from foobar where foo=@foo');
        expect(queryMock.mock.calls[0]![1]).toBeUndefined();
      });

      it('should query with empty named parameters as undefined', async () => {
        const pool = new Pool({
          connectionString: 'postgres://foo:bar@baz:1234/xur',
        });
        const expectedResult = faker.string.uuid();
        const queryMock = vi.fn().mockResolvedValue(expectedResult);
        const releaseMock = vi.fn().mockResolvedValue(undefined);
        const connection = {
          query: queryMock,
          release: releaseMock,
        } as unknown as PoolClient;
        vi.spyOn(pool, 'connect').mockResolvedValue(connection);

        await pool.query('select foo from foobar', {});

        expect(queryMock.mock.calls[0]![0]).toBe('select foo from foobar');
        expect(queryMock.mock.calls[0]![1]).toBeUndefined();
      });
    });
  });

  describe('Integration tests', () => {
    interface WithProcessId extends PoolClient {
      processID?: number;
    }

    const connectionString = 'postgres://postgres:postgres@127.0.0.1:5432/postgres';

    it('should leave connection idle after calling connect() & release() and close all connections after calling end()', async () => {
      const pool1 = new Pool({
        connectionString,
      });
      const pool2 = new Pool({
        connectionString,
      });
      const validatorPool = new Pool({
        connectionString,
      });

      const warmConnections: WithProcessId[] = await Promise.all([pool1.connect(), pool2.connect()]);

      await Promise.all(warmConnections.map((connection) => connection.release()));

      expect(pool1.idleCount).toBe(1);
      expect(pool1.totalCount).toBe(1);
      expect(pool1.waitingCount).toBe(0);

      expect(pool2.idleCount).toBe(1);
      expect(pool2.totalCount).toBe(1);
      expect(pool2.waitingCount).toBe(0);

      const processIds = [];
      for (const connection of warmConnections) {
        assert(connection.processID);
        processIds.push(connection.processID);
      }

      processIds.sort((first, second) => first - second);

      const { rows: idleRows } = await validatorPool.query('select pid, state from "pg_stat_activity" where pid=ANY($1) order by pid', [processIds]);
      expect(idleRows).toStrictEqual(
        processIds.map((processId) => ({
          pid: processId,
          state: 'idle',
        })),
      );

      await pool1.end();
      await pool2.end();

      expect(pool1.idleCount).toBe(0);
      expect(pool1.totalCount).toBe(0);
      expect(pool1.waitingCount).toBe(0);

      expect(pool2.idleCount).toBe(0);
      expect(pool2.totalCount).toBe(0);
      expect(pool2.waitingCount).toBe(0);

      const { rows: rowsAfterEnd } = await validatorPool.query('select pid, state from "pg_stat_activity" where pid=ANY($1) ', [processIds]);
      expect(rowsAfterEnd).toStrictEqual([]);
      await validatorPool.end();
    });

    it('should properly close connections in Promise.all()', async () => {
      const pool1 = new Pool({
        connectionString,
      });
      const pool2 = new Pool({
        connectionString,
      });
      const validatorPool = new Pool({
        connectionString,
      });

      const warmConnections: WithProcessId[] = await Promise.all([pool1.connect(), pool2.connect()]);

      await Promise.all(warmConnections.map((connection) => connection.release()));

      const processIds = [];
      for (const connection of warmConnections) {
        assert(connection.processID);
        processIds.push(connection.processID);
      }

      processIds.sort((first, second) => first - second);

      const { rows: idleRows } = await validatorPool.query('select pid, state from "pg_stat_activity" where pid=ANY($1) order by pid', [processIds]);
      expect(idleRows).toStrictEqual(
        processIds.map((processId) => ({
          pid: processId,
          state: 'idle',
        })),
      );

      expect(pool1.idleCount).toBe(1);
      expect(pool1.totalCount).toBe(1);
      expect(pool1.waitingCount).toBe(0);

      expect(pool2.idleCount).toBe(1);
      expect(pool2.totalCount).toBe(1);
      expect(pool2.waitingCount).toBe(0);

      await Promise.all([pool1.end(), pool2.end()]);

      expect(pool1.idleCount).toBe(0);
      expect(pool1.totalCount).toBe(0);
      expect(pool1.waitingCount).toBe(0);

      expect(pool2.idleCount).toBe(0);
      expect(pool2.totalCount).toBe(0);
      expect(pool2.waitingCount).toBe(0);

      const { rows: rowsAfterEnd } = await validatorPool.query('select pid, state from "pg_stat_activity" where pid=ANY($1) ', [processIds]);
      expect(rowsAfterEnd).toStrictEqual([]);
      await validatorPool.end();
    });

    it('should properly close multiple connections from multiple pools with Promise.all()', async () => {
      const pool1 = new Pool({
        connectionString,
      });
      const pool2 = new Pool({
        connectionString,
      });
      const validatorPool = new Pool({
        connectionString,
      });

      const warmConnections: WithProcessId[] = await Promise.all([pool1.connect(), pool1.connect(), pool2.connect(), pool2.connect()]);

      await Promise.all(warmConnections.map((connection) => connection.release()));

      const processIds = [];
      for (const connection of warmConnections) {
        assert(connection.processID);
        processIds.push(connection.processID);
      }

      processIds.sort((first, second) => first - second);

      const { rows: idleRows } = await validatorPool.query('select pid, state from "pg_stat_activity" where pid=ANY($1) order by pid', [processIds]);
      expect(idleRows).toStrictEqual(
        processIds.map((processId) => ({
          pid: processId,
          state: 'idle',
        })),
      );

      expect(pool1.idleCount).toBe(2);
      expect(pool1.totalCount).toBe(2);
      expect(pool1.waitingCount).toBe(0);

      expect(pool2.idleCount).toBe(2);
      expect(pool2.totalCount).toBe(2);
      expect(pool2.waitingCount).toBe(0);

      await Promise.all([pool1.end(), pool2.end()]);

      expect(pool1.idleCount).toBe(0);
      expect(pool1.totalCount).toBe(0);
      expect(pool1.waitingCount).toBe(0);

      expect(pool2.idleCount).toBe(0);
      expect(pool2.totalCount).toBe(0);
      expect(pool2.waitingCount).toBe(0);

      const { rows: rowsAfterEnd } = await validatorPool.query('select pid, state from "pg_stat_activity" where pid=ANY($1) ', [processIds]);
      expect(rowsAfterEnd).toStrictEqual([]);
      await validatorPool.end();
    });

    it('should properly close multiple connections from multiple pools with Promise.all() - 2', async () => {
      const pool1 = new Pool({
        connectionString,
      });
      const pool2 = new Pool({
        connectionString,
      });
      const validatorPool = new Pool({
        connectionString,
      });

      const warmConnections: WithProcessId[] = await Promise.all([pool1.connect(), pool1.connect(), pool2.connect(), pool2.connect()]);

      await Promise.all(warmConnections.map((connection) => connection.release()));

      const processIds = [];
      for (const connection of warmConnections) {
        assert(connection.processID);
        processIds.push(connection.processID);
      }

      processIds.sort((first, second) => first - second);

      const { rows: idleRows } = await validatorPool.query('select pid, state from "pg_stat_activity" where pid=ANY($1) order by pid', [processIds]);
      expect(idleRows).toStrictEqual(
        processIds.map((processId) => ({
          pid: processId,
          state: 'idle',
        })),
      );

      expect(pool1.idleCount).toBe(2);
      expect(pool1.totalCount).toBe(2);
      expect(pool1.waitingCount).toBe(0);

      expect(pool2.idleCount).toBe(2);
      expect(pool2.totalCount).toBe(2);
      expect(pool2.waitingCount).toBe(0);

      function closePool(pool: Pool): Promise<void> {
        try {
          return pool.end();
        } catch (ex) {
          // Simulating something more complex
          // eslint-disable-next-line no-console
          console.error(ex);

          throw ex;
        }
      }

      await Promise.all([closePool(pool1), closePool(pool2)]);

      expect(pool1.idleCount).toBe(0);
      expect(pool1.totalCount).toBe(0);
      expect(pool1.waitingCount).toBe(0);

      expect(pool2.idleCount).toBe(0);
      expect(pool2.totalCount).toBe(0);
      expect(pool2.waitingCount).toBe(0);

      const { rows: rowsAfterEnd } = await validatorPool.query('select pid, state from "pg_stat_activity" where pid=ANY($1) ', [processIds]);
      expect(rowsAfterEnd).toStrictEqual([]);
      await validatorPool.end();
    });

    it('should close all connections in a pool when running more queries than available connections', async () => {
      const validatorPool = new Pool({
        connectionString,
      });
      const validatorConnection: WithProcessId = await validatorPool.connect();
      await validatorConnection.release();

      const pool = new Pool({
        connectionString,
        poolSize: 2,
      });

      const { rows: rowsBefore } = await validatorPool.query(
        `
      select
        *
      from "pg_stat_activity"
      where
        usename=@username
        AND pid > @validatorPid
    `,
        {
          username: 'postgres',
          validatorPid: validatorConnection.processID,
        },
      );
      expect(rowsBefore).toStrictEqual([]);

      // Run more queries than poolSize at the same time
      await Promise.all([
        pool.query('select * from pg_stat_activity order by pid'),
        pool.query('select * from pg_stat_activity order by state_change'),
        pool.query('select * from pg_stat_activity order by backend_start'),
        pool.query('select * from pg_stat_activity order by pid,state_change'),
        pool.query('select * from pg_stat_activity order by backend_start,pid'),
        pool.query('select * from pg_stat_activity'),
      ]);

      expect(pool.idleCount).toBe(2);
      expect(pool.totalCount).toBe(2);
      expect(pool.waitingCount).toBe(0);

      await pool.end();

      const { rows: rowsAfterEnd } = await validatorPool.query(
        `
      select
        *
      from "pg_stat_activity"
      where
        usename=@username
        AND pid > @validatorPid
    `,
        {
          username: 'postgres',
          validatorPid: validatorConnection.processID,
        },
      );
      expect(rowsAfterEnd).toStrictEqual([]);
      await validatorPool.end();
    });
  });
});
