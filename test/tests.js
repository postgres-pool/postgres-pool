'use strict';

const chai = require('chai');
chai.should();
chai.use(require('chai-as-promised'));

const faker = require('faker');
const sinon = require('sinon');
const { Client } = require('pg');
const { Pool } = require('../dist/index.js');

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
    const connectStub = sinon.stub(Client.prototype, 'connect').returns(new Promise((resolve) => {
      setTimeout(resolve, 100);
    }));
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
    const connectStub = sinon.stub(Client.prototype, 'connect').returns(new Promise((resolve) => {
      setTimeout(resolve, 100);
    }));
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
      await Promise.all([
        pool.query('query - 1'),
        pool.query('query - 2'),
        pool.query('query - 3'),
        pool.query('query - 4'),
      ]);
    } catch (ex) {
      // ignore
    }
    createConnectionStub.restore();
    queryStub.restore();
    releaseStub.restore();

    pool.connections.length.should.equal(poolSize);
  });
});
