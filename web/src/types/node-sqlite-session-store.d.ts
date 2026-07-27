declare module 'node-sqlite-session-store' {
  import { Store } from 'express-session'
  import { DatabaseSync } from 'node:sqlite'

  interface SQLiteStoreOptions {
    db: DatabaseSync
    ttl?: number
  }

  export class SQLiteStore extends Store {
    constructor(options: SQLiteStoreOptions)
  }
}
