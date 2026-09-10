// Regression fixture for the referenced-timer leak (connectionTimeoutMillis and
// waitForAvailableConnectionTimeoutMillis). Targets dist/index.js, not src, because plain
// `node` can't resolve this repo's NodeNext-style ".js" import specifiers back to their
// ".ts" sources outside of the build/Vite pipeline.
//
// Exercises both the direct-connect and queued-connect paths, then lets the process exit on
// its own with no process.exit() call. If either timer leaked as a referenced handle, this
// process would hang for up to the configured 60s instead of exiting here.

import pg from 'pg';

import { Pool } from '../../dist/index.js';

pg.Client.prototype.connect = async function connect() {
  /* empty */
};

pg.Client.prototype.end = async function end() {
  /* empty */
};

const pool = new Pool({
  connectionString: 'postgres://foo:bar@baz:1234/xur',
  poolSize: 1,
  connectionTimeoutMillis: 60000,
  waitForAvailableConnectionTimeoutMillis: 60000,
  idleTimeoutMillis: 0,
});

const first = await pool.connect();
const queuedConnectionPromise = pool.connect();
await first.release();
const second = await queuedConnectionPromise;
await second.release();
await pool.end();
