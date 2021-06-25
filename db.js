var async = require("async");
//require('dotenv').load()

const { Pool, Client } = require('pg')
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
})

module.exports = {
  create_table: (table, tableName, callback) => {
    console.log("table: " + table)
    if (table == "vva_users"){
      return pool.query(
        'CREATE TABLE IF NOT EXISTS ' + tableName + '(ext_id BIGINT PRIMARY KEY, access_token TEXT NOT NULL, sub_id VARCHAR(64) NOT NULL, settings TEXT)', callback);
    }else if (table == "phonereputation"){
      return pool.query(
        'CREATE TABLE IF NOT EXISTS ' + tableName + '(phone_number VARCHAR(15) PRIMARY KEY, level VARCHAR(12) NOT NULL, score INT DEFAULT 0, recommendation VARCHAR(20) NULL, source VARCHAR(12) NULL,last_update BIGINT NOT NULL)', callback);
    }else if (table == "subscriptionids"){
      return pool.query(
        'CREATE TABLE IF NOT EXISTS ' + tableName + '(ext_id BIGINT PRIMARY KEY, sub_id VARCHAR(64) NOT NULL, autotranscribe BOOLEAN DEFAULT false)', callback);
    }else if (table == "customer"){
      return pool.query(
        'CREATE TABLE IF NOT EXISTS ' + tableName + '(customer_id BIGINT PRIMARY KEY, first_name VARCHAR(20), last_name VARCHAR(20), phone_number VARCHAR(15), phone_number_type VARCHAR(10), email VARCHAR(48), address VARCHAR(128), ssn VARCHAR(10), level INT)', callback);
    }else if (table == "voicemail"){
      return pool.query(
        'CREATE TABLE IF NOT EXISTS ' + tableName + '(vm_id BIGINT PRIMARY KEY, date BIGINT NOT NULL, from_number VARCHAR(15), from_name VARCHAR(64), number_type VARCHAR(10), to_number VARCHAR(15), to_name VARCHAR(64), content_uri VARCHAR(256) NOT NULL, duration INT DEFAULT 0, transcript TEXT NOT NULL, status VARCHAR(12)  NOT NULL, confidence INT NOT NULL DEFAULT 0, phone_number_info TEXT, processed BOOLEAN DEFAULT false, event_type VARCHAR(12) NOT NULL, categories VARCHAR(24), assigned VARCHAR(24))', callback);
    }
  },
  createIndex: (query, callback) => {
    return pool.query(query, callback);
  },
  delete_table:(query, callback) => {
    return pool.query(query, callback)
  },
  end_transaction: () => {
    pool.end();
  },
  insert_row: (query, values, callback) => {
    return pool.connect((err, client, done) => {
      const shouldAbort = (err) => {
        if (err) {
          console.error('Error in transaction', err.stack)
          client.query('ROLLBACK', (err) => {
            if (err) {
              console.error('Error rolling back client', err.stack)
            }
            // release the client back to the pool
            done()
          })
        }
        return !!err
      }
      client.query('BEGIN', (err) => {
        if (shouldAbort(err)) return
        client.query(query, values, (err, res) => {
          if (shouldAbort(err)) return
          client.query('COMMIT', (err) => {
            if (err) {
              console.error('Error committing transaction', err.stack)
            }
            done()
          })
        })
      })
    })
  },

  read: (query, callback) => {
    return pool.query(query, callback)
  },
  update: (query, callback) => {
    return pool.query(query, callback)
  },
  insert: (query, params, callback) => {
    return pool.query(query, params, callback)
  },
  remove:(query, callback) => {
    return pool.query(query, callback)
  },
}
