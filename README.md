# postgres-pool

[![NPM version](https://img.shields.io/npm/v/postgres-pool.svg?style=flat)](https://npmjs.org/package/postgres-pool)
[![node version](https://img.shields.io/node/v/postgres-pool.svg?style=flat)](https://nodejs.org)
[![Known Vulnerabilities](https://snyk.io/test/npm/postgres-pool/badge.svg)](https://snyk.io/test/npm/postgres-pool)

Connection pool implementation for [pg](https://node-postgres.com/). Compatible with [pg-pool](https://github.com/brianc/node-pg-pool) options and syntax.

### Why?

There were some connection timeout issues that we encountered with pg-pool and the npm was not being updated. Typescript was used to enforce type safety and promises are preferred over callbacks.

## Getting Started

### Simple query (automatically releases connection after query - recommended)

```js
const { Pool } = require('postgres-pool');

const pool = new Pool({
  connectionString: 'postgres://username:pwd@127.0.0.1/db_name',
});

const userId = 42;
const results = await pool.query('SELECT * from "users" where id=$1', [userId]);

console.log('user:', results.rows[0])
```

### More control over connections (not recommended)

```js
const { Pool } = require('postgres-pool');

const pool = new Pool({
  connectionString: 'postgres://username:pwd@127.0.0.1/db_name',
});

const userId = 42;
const connection = await pool.connect();
try {
  const results = await connection.query('SELECT * from "users" where id=$1', [userId]);
  console.log('user:', results.rows[0])
} finally {
  // NOTE: You MUST call connection.release() to return the connection back to the pool
  await connection.release();
}
```

### Handle errors from connections in the pool

```js
const { Pool } = require('postgres-pool');

const pool = new Pool({
  connectionString: 'postgres://username:pwd@127.0.0.1/db_name',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});
```

### Graceful shutdown

```js
const { Pool } = require('postgres-pool');

const pool = new Pool({
  connectionString: 'postgres://username:pwd@127.0.0.1/db_name',
});

await pool.end();
```

### Explicit connection details instead of a connection string

```js
const { Pool } = require('postgres-pool');

const pool = new Pool({
  host: '127.0.0.1',
  database: 'db_name',
  user: 'foo',
  password: 'bar',
  port: 1234,
});
```

### Change size of the pool

```js
const { Pool } = require('postgres-pool');

const pool = new Pool({
  connectionString: 'postgres://username:pwd@127.0.0.1/db_name',
  poolSize: 10, // Default is 10 connections
});
```

### Change timeout thresholds

```js
const { Pool } = require('postgres-pool');

const pool = new Pool({
  connectionString: 'postgres://username:pwd@127.0.0.1/db_name',
  idleTimeoutMillis: 10000, // Time to keep a connection idle. Default is 10s
  waitForAvailableConnectionTimeoutMillis: 90000, // Time to wait to obtain a connection from the pool. Default is 90s
  connectionTimeoutMillis: 30000, // Max time to connect to postgres. Default is 30s
});
```

## Compatibility
- Node.js 8.x or above

## License
MIT

