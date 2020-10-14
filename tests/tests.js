const chai = require('chai');
const faker = require('faker');
const { Client } = require('pg');
const sinon = require('sinon');

const { Pool } = require('../dist/index.js');

chai.should();
chai.use(require('chai-as-promised'));

describe('#constructor()', () => {
  it('should pass connectionString to client', async () => {
    const stub = sinon.stub(Client.prototype, 'connect').returns(true);

    const connectionString = 'postgres://foo:bar@baz:1234/xur';
    const pool = new Pool({
      connectionString,
    });
    pool.options.connectionString.should.equal(connectionString);

    await pool.connect();
    stub.restore();
    stub.calledOnce.should.equal(true);
  });
});

describe('#connect()', () => {
  it('should throw if connecting exceeds connectionTimeoutMillis', async () => {
    const connectStub = sinon.stub(Client.prototype, 'connect').returns(
      new Promise((resolve) => {
        setTimeout(resolve, 100);
      }),
    );
    const endStub = sinon.stub(Client.prototype, 'end').returns(true);

    const pool = new Pool({
      connectionString: 'postgres://foo:bar@baz:1234/xur',
      connectionTimeoutMillis: 1,
    });

    try {
      await pool.connect();
      false.should.equal(true);
    } catch (ex) {
      ex.message.should.equal('Timed out trying to connect to postgres');
    } finally {
      connectStub.restore();
      endStub.restore();
    }
  });
  it('should call end() if timeout during connecting', async () => {
    const connectStub = sinon.stub(Client.prototype, 'connect').returns(
      new Promise((resolve) => {
        setTimeout(resolve, 100);
      }),
    );
    const endStub = sinon.stub(Client.prototype, 'end').returns(true);

    const pool = new Pool({
      connectionString: 'postgres://foo:bar@baz:1234/xur',
      connectionTimeoutMillis: 1,
    });

    try {
      await pool.connect();
      false.should.equal(true);
    } catch (ex) {
      // Note: We expect this to fail
    } finally {
      connectStub.restore();
      endStub.restore();
    }

    endStub.calledOnce.should.equal(true);
  });
  it('should not consume a pool connection when connecting times out', async () => {
    const connectStub = sinon.stub(Client.prototype, 'connect').returns(
      new Promise((resolve) => {
        setTimeout(resolve, 100);
      }),
    );
    const endStub = sinon.stub(Client.prototype, 'end').returns(true);

    const pool = new Pool({
      connectionString: 'postgres://foo:bar@baz:1234/xur',
      connectionTimeoutMillis: 1,
    });

    try {
      await pool.connect();
      false.should.equal(true);
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
  describe('retryQueryWhenDatabaseIsStarting', () => {
    it('should not try to reconnect if reconnectOnDatabaseIsStartingError=false and "the database system is starting up" is thrown', async () => {
      const pool = new Pool({
        connectionString: 'postgres://foo:bar@baz:1234/xur',
        reconnectOnDatabaseIsStartingError: false,
      });
      const connectStub = sinon.stub(Client.prototype, 'connect').throws(new Error('the database system is starting up'));

      try {
        await pool.query('foo');
        false.should.equal(true);
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
      const connectStub = sinon.stub(Client.prototype, 'connect').returns(true);
      const queryStub = sinon.stub(Client.prototype, 'query').returns(returnResult);
      const endStub = sinon.stub(Client.prototype, 'end').returns(Promise.resolve());

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
      connectStub.onCall(1).returns(true);
      const queryStub = sinon.stub(Client.prototype, 'query').returns(returnResult);
      const endStub = sinon.stub(Client.prototype, 'end').returns(Promise.resolve());

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
      connectStub.onCall(1).returns(true);
      const queryStub = sinon.stub(Client.prototype, 'query').returns(returnResult);
      const endStub = sinon.stub(Client.prototype, 'end').returns(Promise.resolve());

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
    const expectedResult = faker.random.uuid();
    const connection = {
      query() {},
      release() {},
    };
    const connectStub = sinon.stub(pool, 'connect').returns(connection);
    const queryStub = sinon.stub(connection, 'query').returns(expectedResult);
    const releaseStub = sinon.stub(connection, 'release').returns(true);

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
      query() {},
      release() {},
    };
    const connectStub = sinon.stub(pool, 'connect').returns(connection);
    const queryStub = sinon.stub(connection, 'query').throws();
    const releaseStub = sinon.stub(connection, 'release').returns(true);

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
    pool.connections.length.should.equal(0);

    const expectedResult = faker.random.uuid();
    const connection = {
      uniqueId: faker.random.uuid(),
      query() {},
      release() {},
    };
    const createConnectionStub = sinon.stub(pool, '_createConnection').returns(connection);
    const queryStub = sinon.stub(connection, 'query').returns(expectedResult);
    const releaseStub = sinon.stub(connection, 'release').returns(true);

    try {
      await Promise.all([pool.query('query - 1'), pool.query('query - 2'), pool.query('query - 3'), pool.query('query - 4')]);
    } catch (ex) {
      // ignore
    }

    createConnectionStub.restore();
    queryStub.restore();
    releaseStub.restore();

    pool.connections.length.should.equal(poolSize);
  });
  describe('retryQueryWhenDatabaseIsStarting', () => {
    it('should not try connecting again if retryQueryWhenDatabaseIsStarting=false and "cannot execute X in a read-only transaction" is thrown', async () => {
      const pool = new Pool({
        connectionString: 'postgres://foo:bar@baz:1234/xur',
        reconnectOnReadOnlyTransactionError: false,
      });
      const connection = {
        query() {},
        release() {},
      };
      const connectStub = sinon.stub(pool, 'connect').returns(connection);
      const queryStub = sinon.stub(connection, 'query').throws(new Error('cannot execute UPDATE in a read-only transaction'));
      const releaseStub = sinon.stub(connection, 'release').returns(true);

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
        query() {},
        release() {},
      };
      const connectStub = sinon.stub(pool, 'connect').returns(connection);
      const queryStub = sinon.stub(connection, 'query').throws(new Error('Some other error'));
      const releaseStub = sinon.stub(connection, 'release').returns(true);

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
        query() {},
        release() {},
      };
      const connectStub = sinon.stub(pool, 'connect').returns(connection);
      const queryStub = sinon.stub(connection, 'query').returns(returnResult);
      const releaseStub = sinon.stub(connection, 'release').returns(true);

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
        query() {},
        release() {},
      };
      const connectStub = sinon.stub(pool, 'connect').returns(connection);
      const queryStub = sinon.stub(connection, 'query');
      queryStub.onCall(0).throws(new Error('cannot execute CREATE in a read-only transaction'));
      queryStub.onCall(1).returns(returnResult);
      const releaseStub = sinon.stub(connection, 'release').returns(true);

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
        query() {},
        release() {},
      };
      const connectStub = sinon.stub(pool, 'connect').returns(connection);
      const queryStub = sinon.stub(connection, 'query');
      queryStub.onCall(0).throws(new Error('cannot execute CREATE in a read-only transaction'));
      queryStub.onCall(1).returns(returnResult);
      const releaseStub = sinon.stub(connection, 'release').returns(true);

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
      const expectedResult = faker.random.uuid();
      const connection = {
        query() {},
        release() {},
      };
      const connectStub = sinon.stub(pool, 'connect').returns(connection);
      const queryStub = sinon.stub(connection, 'query').returns(expectedResult);
      const releaseStub = sinon.stub(connection, 'release').returns(true);

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
      const expectedResult = faker.random.uuid();
      const connection = {
        query() {},
        release() {},
      };
      const connectStub = sinon.stub(pool, 'connect').returns(connection);
      const queryStub = sinon.stub(connection, 'query').returns(expectedResult);
      const releaseStub = sinon.stub(connection, 'release').returns(true);

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
      const expectedResult = faker.random.uuid();
      const connection = {
        query() {},
        release() {},
      };
      const connectStub = sinon.stub(pool, 'connect').returns(connection);
      const queryStub = sinon.stub(connection, 'query').returns(expectedResult);
      const releaseStub = sinon.stub(connection, 'release').returns(true);

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
      const expectedResult = faker.random.uuid();
      const connection = {
        query() {},
        release() {},
      };
      const connectStub = sinon.stub(pool, 'connect').returns(connection);
      const queryStub = sinon.stub(connection, 'query').returns(expectedResult);
      const releaseStub = sinon.stub(connection, 'release').returns(true);

      await pool.query('select foo from foobar where foo=@foo');
      connectStub.restore();
      queryStub.restore();
      releaseStub.restore();

      connectStub.calledOnce.should.equal(true);
      queryStub.calledOnce.should.equal(true);
      releaseStub.calledOnce.should.equal(true);

      queryStub.getCall(0).args[0].should.equal('select foo from foobar where foo=@foo');
      (typeof queryStub.getCall(0).args[1] === 'undefined').should.equal(true);
    });
  });
});
