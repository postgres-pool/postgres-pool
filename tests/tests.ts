import assert from 'assert';
import { setTimeout } from 'timers/promises';

import { faker } from '@faker-js/faker';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import type { PoolClient } from 'pg';
import { Client } from 'pg';
import * as sinon from 'sinon';

import type { PoolClientWithConnection } from '../src';
import { Pool } from '../src';

describe('postgres-pool', () => {
  let should: Chai.Should;

  before(() => {
    should = chai.should();
    chai.use(chaiAsPromised);
  });

  describe('#constructor()', () => {
    it('should pass connectionString to client', async () => {
      const stub = sinon.stub(Client.prototype, 'connect');

      const connectionString = 'postgres://foo:bar@baz:1234/xur';
      const pool = new Pool({
        connectionString,
      });

      await pool.connect();
      stub.restore();
      stub.calledOnce.should.equal(true);
    });
  });

  describe('#connect()', () => {
    it('should throw if connecting exceeds connectionTimeoutMillis', async () => {
      const connectStub = sinon.stub(Client.prototype, 'connect').resolves(setTimeout(10000));
      const endStub = sinon.stub(Client.prototype, 'end');

      const pool = new Pool({
        connectionString: 'postgres://foo:bar@baz:1234/xur',
        connectionTimeoutMillis: 1,
        retryConnectionMaxRetries: 1,
      });

      try {
        await pool.connect();
        assert.fail('Successful connection - This should not happen');
      } catch (ex) {
        ex.message.should.equal('Timed out trying to connect to postgres');
      } finally {
        connectStub.restore();
        endStub.restore();
      }
    });

    it('should call end() if timeout during connecting', async () => {
      const connectStub = sinon.stub(Client.prototype, 'connect').resolves(setTimeout(10000));
      const endStub = sinon.stub(Client.prototype, 'end');

      const pool = new Pool({
        connectionString: 'postgres://foo:bar@baz:1234/xur',
        connectionTimeoutMillis: 1,
        retryConnectionMaxRetries: 0,
      });

      try {
        await pool.connect();
        assert.fail('Successful connection - This should not happen');
      } catch (ex) {
        // Note: We expect this to fail
      } finally {
        connectStub.restore();
        endStub.restore();
      }

      endStub.calledOnce.should.equal(true);
    });

    it('should not consume a pool connection when connecting times out - timeout expired', async () => {
      const connectStub = sinon.stub(Client.prototype, 'connect').throws(new Error('timeout expired'));
      const endStub = sinon.stub(Client.prototype, 'end');

      const pool = new Pool({
        connectionString: 'postgres://foo:bar@baz:1234/xur',
        connectionTimeoutMillis: 250,
        retryConnectionMaxRetries: 1,
      });

      try {
        await pool.connect();
        assert.fail('Successful connection - This should not happen');
      } catch (ex) {
        ex.message.should.equal('timeout expired');
      } finally {
        connectStub.restore();
        endStub.restore();
      }

      pool.waitingCount.should.equal(0);
      pool.idleCount.should.equal(0);
      pool.totalCount.should.equal(0);
    });

    it('should not consume a pool connection when connecting times out - ERR_PG_CONNECT_TIMEOUT', async () => {
      const connectStub = sinon.stub(Client.prototype, 'connect').resolves(setTimeout(10000));
      const endStub = sinon.stub(Client.prototype, 'end');

      const pool = new Pool({
        connectionString: 'postgres://foo:bar@baz:1234/xur',
        connectionTimeoutMillis: 1,
        retryConnectionMaxRetries: 1,
      });

      try {
        await pool.connect();
        assert.fail('Successful connection - This should not happen');
      } catch (ex) {
        ex.message.should.equal('Timed out trying to connect to postgres');
      } finally {
        connectStub.restore();
        endStub.restore();
      }

      pool.waitingCount.should.equal(0);
      pool.idleCount.should.equal(0);
      pool.totalCount.should.equal(0);
    });

    it('should emit "connectionAddedToPool" after successful connection', async () => {
      const startTime = process.hrtime.bigint();
      let connectionStartTime;
      const connectStub = sinon.stub(Client.prototype, 'connect').resolves(setTimeout(1));
      const endStub = sinon.stub(Client.prototype, 'end');

      const pool = new Pool({
        connectionString: 'postgres://foo:bar@baz:1234/xur',
      });
      pool.on('connectionAddedToPool', (params) => {
        connectionStartTime = params.startTime;
      });

      await pool.connect();

      connectStub.restore();
      endStub.restore();

      assert(connectionStartTime);
      (connectionStartTime > startTime).should.equal(true);
    });

    it('should not emit "connectionAddedToPool" if connection fails', async () => {
      const connectionAddedToPoolCalled = false;
      const connectStub = sinon.stub(Client.prototype, 'connect').resolves(setTimeout(10000));
      const endStub = sinon.stub(Client.prototype, 'end');

      const pool = new Pool({
        connectionString: 'postgres://foo:bar@baz:1234/xur',
        connectionTimeoutMillis: 1,
      });

      try {
        await pool.connect();
        assert.fail('Successful connection - This should not happen');
      } catch (ex) {
        assert(ex);
      } finally {
        connectStub.restore();
        endStub.restore();
      }

      connectionAddedToPoolCalled.should.equal(false);
    });

    it('should retry connection if client throws "timeout expired" on first attempt', async () => {
      const connectStub = sinon.stub(Client.prototype, 'connect');
      connectStub.onCall(0).throws(new Error('timeout expired'));
      connectStub.resolves();
      const endStub = sinon.stub(Client.prototype, 'end');

      const pool = new Pool({
        connectionString: 'postgres://foo:bar@baz:1234/xur',
        connectionTimeoutMillis: 250,
      });

      await pool.connect();

      connectStub.restore();
      endStub.restore();

      connectStub.calledTwice.should.equal(true);

      pool.waitingCount.should.equal(0);
      pool.idleCount.should.equal(0);
      pool.totalCount.should.equal(1);
    });

    it('should retry connection if ERR_PG_CONNECT_TIMEOUT is thrown on first attempt', async () => {
      const connectStub = sinon.stub(Client.prototype, 'connect');
      connectStub.onCall(0).resolves(setTimeout(10000));
      connectStub.resolves();

      const endStub = sinon.stub(Client.prototype, 'end');

      const pool = new Pool({
        connectionString: 'postgres://foo:bar@baz:1234/xur',
        connectionTimeoutMillis: 250,
      });
      await pool.connect();

      connectStub.restore();
      endStub.restore();

      connectStub.calledTwice.should.equal(true);

      pool.waitingCount.should.equal(0);
      pool.idleCount.should.equal(0);
      pool.totalCount.should.equal(1);
    });

    describe('retryQueryWhenDatabaseIsStarting', () => {
      it('should not try to reconnect if reconnectOnDatabaseIsStartingError=false and "the database system is starting up" is thrown', async () => {
        const pool = new Pool({
          connectionString: 'postgres://foo:bar@baz:1234/xur',
          reconnectOnDatabaseIsStartingError: false,
        });
        const connectStub = sinon.stub(Client.prototype, 'connect').throws(new Error('the database system is starting up'));

        try {
          await pool.query('foo');
          assert.fail('Successful query - This should not happen');
        } catch (ex) {
          // Ignore...
        }

        connectStub.restore();

        connectStub.calledOnce.should.equal(true);
      });

      it('should not try to query again if reconnectOnDatabaseIsStartingError=true and random error is thrown', async () => {
        const pool = new Pool({
          connectionString: 'postgres://foo:bar@baz:1234/xur',
          reconnectOnDatabaseIsStartingError: true,
        });
        const connectStub = sinon.stub(Client.prototype, 'connect').throws(new Error('Some other error'));

        try {
          await pool.query('foo');
          false.should.equal(true);
        } catch (ex) {
          // Ignore...
        }

        connectStub.restore();

        connectStub.calledOnce.should.equal(true);
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
        const connectStub = sinon.stub(Client.prototype, 'connect');
        const queryStub = sinon.stub(Client.prototype, 'query').resolves(returnResult);
        const endStub = sinon.stub(Client.prototype, 'end').resolves();

        const result = await pool.query('foo');
        result.should.deep.equal(returnResult);

        connectStub.restore();
        queryStub.restore();
        endStub.restore();

        connectStub.calledOnce.should.equal(true);
        queryStub.calledOnce.should.equal(true);
        endStub.calledOnce.should.equal(true);
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
        const connectStub = sinon.stub(Client.prototype, 'connect');
        connectStub.onCall(0).throws(new Error('the database system is starting up'));
        connectStub.onCall(1).resolves();
        const queryStub = sinon.stub(Client.prototype, 'query').resolves(returnResult);
        const endStub = sinon.stub(Client.prototype, 'end').resolves();

        const result = await pool.query('foo');
        result.should.deep.equal(returnResult);

        connectStub.restore();
        queryStub.restore();
        endStub.restore();

        connectStub.calledTwice.should.equal(true);
        queryStub.calledOnce.should.equal(true);
        endStub.calledTwice.should.equal(true);
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
        const connectStub = sinon.stub(Client.prototype, 'connect');
        connectStub.onCall(0).throws(new Error('the database system is starting up'));
        connectStub.onCall(1).resolves();
        const queryStub = sinon.stub(Client.prototype, 'query').resolves(returnResult);
        const endStub = sinon.stub(Client.prototype, 'end').resolves();

        const result = await pool.query('foo');
        result.should.deep.equal(returnResult);

        connectStub.restore();
        queryStub.restore();
        endStub.restore();

        connectStub.calledTwice.should.equal(true);
        queryStub.calledOnce.should.equal(true);
        endStub.calledTwice.should.equal(true);
      });
    });
  });

  describe('#query()', () => {
    it('should get a connection from the pool and release the connection after the query', async () => {
      const pool = new Pool({
        connectionString: 'postgres://foo:bar@baz:1234/xur',
      });
      const expectedResult = faker.datatype.uuid();
      const connection = {
        query(): void {},
        release(): void {},
      };
      const connectStub = sinon.stub(pool, 'connect').resolves(connection as unknown as PoolClientWithConnection);
      const queryStub = sinon.stub(connection, 'query').resolves(expectedResult);
      const releaseStub = sinon.stub(connection, 'release').resolves();

      const result = await pool.query('foo');
      connectStub.restore();
      queryStub.restore();
      releaseStub.restore();

      connectStub.calledOnce.should.equal(true);
      queryStub.calledOnce.should.equal(true);
      releaseStub.calledOnce.should.equal(true);

      result.should.equal(expectedResult);
    });

    it('should release the connection if the query throws', async () => {
      const pool = new Pool({
        connectionString: 'postgres://foo:bar@baz:1234/xur',
      });
      const connection = {
        query(): void {},
        release(): void {},
      };
      const connectStub = sinon.stub(pool, 'connect').resolves(connection as unknown as PoolClientWithConnection);
      const queryStub = sinon.stub(connection, 'query').throws();
      const releaseStub = sinon.stub(connection, 'release').resolves();

      try {
        await pool.query('foo');
      } catch (ex) {
        // Ignore...
      }

      connectStub.restore();
      queryStub.restore();
      releaseStub.restore();

      connectStub.calledOnce.should.equal(true);
      queryStub.calledOnce.should.equal(true);
      releaseStub.calledOnce.should.equal(true);
    });

    it('should limit total connections based on poolSize', async () => {
      const poolSize = 2;
      const pool = new Pool({
        connectionString: 'postgres://foo:bar@baz:1234/xur',
        poolSize,
        waitForAvailableConnectionTimeoutMillis: 1,
      });
      // @ts-expect-error - Connections is protected
      pool.connections.length.should.equal(0);

      const expectedResult = faker.datatype.uuid();
      const connection = {
        uniqueId: faker.datatype.uuid(),
        query(): void {},
        release(): void {},
      };
      // @ts-expect-error - _createConnection is private
      const createConnectionStub = sinon.stub(pool, '_createConnection').returns(connection);
      const queryStub = sinon.stub(connection, 'query').resolves(expectedResult);
      const releaseStub = sinon.stub(connection, 'release').resolves();

      try {
        await Promise.all([pool.query('query - 1'), pool.query('query - 2'), pool.query('query - 3'), pool.query('query - 4')]);
      } catch (ex) {
        // ignore
      }

      createConnectionStub.restore();
      queryStub.restore();
      releaseStub.restore();

      // @ts-expect-error - Connections is protected
      pool.connections.length.should.equal(poolSize);
    });

    describe('retryQueryWhenDatabaseIsStarting', () => {
      it('should not try connecting again if retryQueryWhenDatabaseIsStarting=false and "cannot execute X in a read-only transaction" is thrown', async () => {
        const pool = new Pool({
          connectionString: 'postgres://foo:bar@baz:1234/xur',
          reconnectOnReadOnlyTransactionError: false,
        });
        const connection = {
          query(): void {},
          release(): void {},
        };
        const connectStub = sinon.stub(pool, 'connect').resolves(connection as unknown as PoolClientWithConnection);
        const queryStub = sinon.stub(connection, 'query').throws(new Error('cannot execute UPDATE in a read-only transaction'));
        const releaseStub = sinon.stub(connection, 'release').resolves();

        try {
          await pool.query('foo');
        } catch (ex) {
          // Ignore...
        }

        connectStub.restore();
        queryStub.restore();
        releaseStub.restore();

        connectStub.calledOnce.should.equal(true);
        queryStub.calledOnce.should.equal(true);
        releaseStub.calledOnce.should.equal(true);
      });

      it('should not try connecting again if reconnectOnReadOnlyTransactionError=true and non-read-only transaction error is thrown', async () => {
        const pool = new Pool({
          connectionString: 'postgres://foo:bar@baz:1234/xur',
          reconnectOnReadOnlyTransactionError: true,
        });
        const connection = {
          query(): void {},
          release(): void {},
        };
        const connectStub = sinon.stub(pool, 'connect').resolves(connection as unknown as PoolClientWithConnection);
        const queryStub = sinon.stub(connection, 'query').throws(new Error('Some other error'));
        const releaseStub = sinon.stub(connection, 'release').resolves();

        try {
          await pool.query('foo');
        } catch (ex) {
          // Ignore...
        }

        connectStub.restore();
        queryStub.restore();
        releaseStub.restore();

        connectStub.calledOnce.should.equal(true);
        queryStub.calledOnce.should.equal(true);
        releaseStub.calledOnce.should.equal(true);
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
        const connection = {
          query(): void {},
          release(): void {},
        };
        const connectStub = sinon.stub(pool, 'connect').resolves(connection as unknown as PoolClientWithConnection);
        const queryStub = sinon.stub(connection, 'query').resolves(returnResult);
        const releaseStub = sinon.stub(connection, 'release').resolves();

        const result = await pool.query('foo');
        result.should.deep.equal(returnResult);

        connectStub.restore();
        queryStub.restore();
        releaseStub.restore();

        connectStub.calledOnce.should.equal(true);
        queryStub.calledOnce.should.equal(true);
        releaseStub.calledOnce.should.equal(true);
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
        const connection = {
          query(): void {},
          release(): void {},
        };
        const connectStub = sinon.stub(pool, 'connect').resolves(connection as unknown as PoolClientWithConnection);
        const queryStub = sinon.stub(connection, 'query');
        queryStub.onCall(0).throws(new Error('cannot execute CREATE in a read-only transaction'));
        queryStub.onCall(1).resolves(returnResult);
        const releaseStub = sinon.stub(connection, 'release').resolves();

        const result = await pool.query('foo');
        result.should.deep.equal(returnResult);

        connectStub.restore();
        queryStub.restore();
        releaseStub.restore();

        connectStub.calledTwice.should.equal(true);
        queryStub.calledTwice.should.equal(true);
        releaseStub.calledTwice.should.equal(true);
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
        const connection = {
          query(): void {},
          release(): void {},
        };
        const connectStub = sinon.stub(pool, 'connect').resolves(connection as unknown as PoolClientWithConnection);
        const queryStub = sinon.stub(connection, 'query');
        queryStub.onCall(0).throws(new Error('cannot execute CREATE in a read-only transaction'));
        queryStub.onCall(1).resolves(returnResult);
        const releaseStub = sinon.stub(connection, 'release').resolves();

        const result = await pool.query('foo');
        result.should.deep.equal(returnResult);

        connectStub.restore();
        queryStub.restore();
        releaseStub.restore();

        connectStub.calledTwice.should.equal(true);
        queryStub.calledTwice.should.equal(true);
        releaseStub.calledTwice.should.equal(true);
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
        const expectedResult = faker.datatype.uuid();
        const connection = {
          query(_queryText: string, _args: string[]): void {},
          release(): void {},
        };
        const connectStub = sinon.stub(pool, 'connect').resolves(connection as unknown as PoolClientWithConnection);
        const queryStub = sinon.stub(connection, 'query').resolves(expectedResult);
        const releaseStub = sinon.stub(connection, 'release').resolves();

        await pool.query('select foo from foobar where id=@id and (bar=@foobar or bar=@foo) and foo=@foo', {
          id: 'lorem',
          foo: 'lorem - foo',
          foobar: 'lorem - foobar',
          unused: 'lorem - unused',
        });
        connectStub.restore();
        queryStub.restore();
        releaseStub.restore();

        connectStub.calledOnce.should.equal(true);
        queryStub.calledOnce.should.equal(true);
        releaseStub.calledOnce.should.equal(true);

        queryStub.getCall(0).args[0].should.equal('select foo from foobar where id=$1 and (bar=$2 or bar=$3) and foo=$3');
        queryStub.getCall(0).args[1].should.deep.equal(['lorem', 'lorem - foobar', 'lorem - foo']);
      });

      it('should throw if a named parameter is specified in the query string but not present in the query object', async () => {
        const pool = new Pool({
          connectionString: 'postgres://foo:bar@baz:1234/xur',
        });
        const expectedResult = faker.datatype.uuid();
        const connection = {
          query(): void {},
          release(): void {},
        };
        const connectStub = sinon.stub(pool, 'connect').resolves(connection as unknown as PoolClientWithConnection);
        const queryStub = sinon.stub(connection, 'query').resolves(expectedResult);
        const releaseStub = sinon.stub(connection, 'release').resolves();

        try {
          await pool.query('select * from foobar where id=@id', {
            unused: 'lorem - unused',
          });
          true.should.equal(false);
        } catch (ex) {
          ex.message.should.equal('Missing query parameter(s): id');
        } finally {
          connectStub.restore();
          queryStub.restore();
          releaseStub.restore();
        }

        connectStub.called.should.equal(false);
        queryStub.called.should.equal(false);
        releaseStub.called.should.equal(false);
      });

      it('should ignore a query with named parameters if the query object is an array', async () => {
        const pool = new Pool({
          connectionString: 'postgres://foo:bar@baz:1234/xur',
        });
        const expectedResult = faker.datatype.uuid();
        const connection = {
          query(_queryText: string, _args: string[]): void {},
          release(): void {},
        };
        const connectStub = sinon.stub(pool, 'connect').resolves(connection as unknown as PoolClientWithConnection);
        const queryStub = sinon.stub(connection, 'query').resolves(expectedResult);
        const releaseStub = sinon.stub(connection, 'release').resolves();

        await pool.query('select foo from foobar where foo=@foo', [
          {
            foo: 'lorem - foo',
          },
        ]);
        connectStub.restore();
        queryStub.restore();
        releaseStub.restore();

        connectStub.calledOnce.should.equal(true);
        queryStub.calledOnce.should.equal(true);
        releaseStub.calledOnce.should.equal(true);

        queryStub.getCall(0).args[0].should.equal('select foo from foobar where foo=@foo');
        queryStub.getCall(0).args[1].should.deep.equal([
          {
            foo: 'lorem - foo',
          },
        ]);
      });

      it('should ignore a query with named parameters if the query object is undefined', async () => {
        const pool = new Pool({
          connectionString: 'postgres://foo:bar@baz:1234/xur',
        });
        const expectedResult = faker.datatype.uuid();
        const connection = {
          query(_queryText: string, _args: string[]): void {},
          release(): void {},
        };
        const connectStub = sinon.stub(pool, 'connect').resolves(connection as unknown as PoolClientWithConnection);
        const queryStub = sinon.stub(connection, 'query').resolves(expectedResult);
        const releaseStub = sinon.stub(connection, 'release').resolves();

        await pool.query('select foo from foobar where foo=@foo');
        connectStub.restore();
        queryStub.restore();
        releaseStub.restore();

        connectStub.calledOnce.should.equal(true);
        queryStub.calledOnce.should.equal(true);
        releaseStub.calledOnce.should.equal(true);

        queryStub.getCall(0).args[0].should.equal('select foo from foobar where foo=@foo');
        should.not.exist(queryStub.getCall(0).args[1]);
      });

      it('should query with empty named parameters as undefined', async () => {
        const pool = new Pool({
          connectionString: 'postgres://foo:bar@baz:1234/xur',
        });
        const expectedResult = faker.datatype.uuid();
        const connection = {
          query(_queryText: string, _args: string[]): void {},
          release(): void {},
        };
        const connectStub = sinon.stub(pool, 'connect').resolves(connection as unknown as PoolClientWithConnection);
        const queryStub = sinon.stub(connection, 'query').resolves(expectedResult);
        const releaseStub = sinon.stub(connection, 'release').resolves();

        await pool.query('select foo from foobar', {});
        connectStub.restore();
        queryStub.restore();
        releaseStub.restore();

        connectStub.calledOnce.should.equal(true);
        queryStub.calledOnce.should.equal(true);
        releaseStub.calledOnce.should.equal(true);

        queryStub.getCall(0).args[0].should.equal('select foo from foobar');
        should.not.exist(queryStub.getCall(0).args[1]);
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

      for (const connection of warmConnections) {
        connection.release();
      }

      pool1.idleCount.should.equal(1);
      pool1.totalCount.should.equal(1);
      pool1.waitingCount.should.equal(0);

      pool2.idleCount.should.equal(1);
      pool2.totalCount.should.equal(1);
      pool2.waitingCount.should.equal(0);

      const processIds = [];
      for (const connection of warmConnections) {
        assert(connection.processID);
        processIds.push(connection.processID);
      }

      processIds.sort((first, second) => first - second);

      const { rows: idleRows } = await validatorPool.query('select pid, state from "pg_stat_activity" where pid=ANY($1) order by pid', [processIds]);
      idleRows.should.deep.equal(
        processIds.map((processId) => {
          return {
            pid: processId,
            state: 'idle',
          };
        }),
      );

      await pool1.end();
      await pool2.end();

      pool1.idleCount.should.equal(0);
      pool1.totalCount.should.equal(0);
      pool1.waitingCount.should.equal(0);

      pool2.idleCount.should.equal(0);
      pool2.totalCount.should.equal(0);
      pool2.waitingCount.should.equal(0);

      const { rows: rowsAfterEnd } = await validatorPool.query('select pid, state from "pg_stat_activity" where pid=ANY($1) ', [processIds]);
      rowsAfterEnd.should.deep.equal([]);
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

      await Promise.all(
        // eslint-disable-next-line array-callback-return
        warmConnections.map((connection) => {
          connection.release();
        }),
      );

      const processIds = [];
      for (const connection of warmConnections) {
        assert(connection.processID);
        processIds.push(connection.processID);
      }

      processIds.sort((first, second) => first - second);

      const { rows: idleRows } = await validatorPool.query('select pid, state from "pg_stat_activity" where pid=ANY($1) order by pid', [processIds]);
      idleRows.should.deep.equal(
        processIds.map((processId) => {
          return {
            pid: processId,
            state: 'idle',
          };
        }),
      );

      pool1.idleCount.should.equal(1);
      pool1.totalCount.should.equal(1);
      pool1.waitingCount.should.equal(0);

      pool2.idleCount.should.equal(1);
      pool2.totalCount.should.equal(1);
      pool2.waitingCount.should.equal(0);

      await Promise.all([pool1.end(), pool2.end()]);

      pool1.idleCount.should.equal(0);
      pool1.totalCount.should.equal(0);
      pool1.waitingCount.should.equal(0);

      pool2.idleCount.should.equal(0);
      pool2.totalCount.should.equal(0);
      pool2.waitingCount.should.equal(0);

      const { rows: rowsAfterEnd } = await validatorPool.query('select pid, state from "pg_stat_activity" where pid=ANY($1) ', [processIds]);
      rowsAfterEnd.should.deep.equal([]);
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

      await Promise.all(
        // eslint-disable-next-line array-callback-return
        warmConnections.map((connection) => {
          connection.release();
        }),
      );

      const processIds = [];
      for (const connection of warmConnections) {
        assert(connection.processID);
        processIds.push(connection.processID);
      }

      processIds.sort((first, second) => first - second);

      const { rows: idleRows } = await validatorPool.query('select pid, state from "pg_stat_activity" where pid=ANY($1) order by pid', [processIds]);
      idleRows.should.deep.equal(
        processIds.map((processId) => {
          return {
            pid: processId,
            state: 'idle',
          };
        }),
      );

      pool1.idleCount.should.equal(2);
      pool1.totalCount.should.equal(2);
      pool1.waitingCount.should.equal(0);

      pool2.idleCount.should.equal(2);
      pool2.totalCount.should.equal(2);
      pool2.waitingCount.should.equal(0);

      await Promise.all([pool1.end(), pool2.end()]);

      pool1.idleCount.should.equal(0);
      pool1.totalCount.should.equal(0);
      pool1.waitingCount.should.equal(0);

      pool2.idleCount.should.equal(0);
      pool2.totalCount.should.equal(0);
      pool2.waitingCount.should.equal(0);

      const { rows: rowsAfterEnd } = await validatorPool.query('select pid, state from "pg_stat_activity" where pid=ANY($1) ', [processIds]);
      rowsAfterEnd.should.deep.equal([]);
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

      await Promise.all(
        // eslint-disable-next-line array-callback-return
        warmConnections.map((connection) => {
          connection.release();
        }),
      );

      const processIds = [];
      for (const connection of warmConnections) {
        assert(connection.processID);
        processIds.push(connection.processID);
      }

      processIds.sort((first, second) => first - second);

      const { rows: idleRows } = await validatorPool.query('select pid, state from "pg_stat_activity" where pid=ANY($1) order by pid', [processIds]);
      idleRows.should.deep.equal(
        processIds.map((processId) => {
          return {
            pid: processId,
            state: 'idle',
          };
        }),
      );

      pool1.idleCount.should.equal(2);
      pool1.totalCount.should.equal(2);
      pool1.waitingCount.should.equal(0);

      pool2.idleCount.should.equal(2);
      pool2.totalCount.should.equal(2);
      pool2.waitingCount.should.equal(0);

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

      pool1.idleCount.should.equal(0);
      pool1.totalCount.should.equal(0);
      pool1.waitingCount.should.equal(0);

      pool2.idleCount.should.equal(0);
      pool2.totalCount.should.equal(0);
      pool2.waitingCount.should.equal(0);

      const { rows: rowsAfterEnd } = await validatorPool.query('select pid, state from "pg_stat_activity" where pid=ANY($1) ', [processIds]);
      rowsAfterEnd.should.deep.equal([]);
      await validatorPool.end();
    });

    it('should close all connections in a pool when running more queries than available connections', async () => {
      const validatorPool = new Pool({
        connectionString,
      });
      const validatorConnection: WithProcessId = await validatorPool.connect();
      validatorConnection.release();

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
      rowsBefore.should.deep.equal([]);

      // Run more queries than poolSize at the same time
      await Promise.all([
        pool.query('select * from pg_stat_activity order by pid'),
        pool.query('select * from pg_stat_activity order by state_change'),
        pool.query('select * from pg_stat_activity order by backend_start'),
        pool.query('select * from pg_stat_activity order by pid,state_change'),
        pool.query('select * from pg_stat_activity order by backend_start,pid'),
        pool.query('select * from pg_stat_activity'),
      ]);

      pool.idleCount.should.equal(2);
      pool.totalCount.should.equal(2);
      pool.waitingCount.should.equal(0);

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
      rowsAfterEnd.should.deep.equal([]);
      await validatorPool.end();
    });
  });
});
