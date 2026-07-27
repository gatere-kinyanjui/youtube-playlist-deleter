import { ValidationPipe, ConsoleLogger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import helmet from 'helmet'
import { AppModule } from './app.module'
import session from 'express-session'
import { SQLiteStore } from 'node-sqlite-session-store'
import { DatabaseSync } from 'node:sqlite'
import * as fs from 'fs'

class JsonLogger extends ConsoleLogger {
  protected formatMessage(logLevel: string, message: unknown): string {
    return JSON.stringify({ level: logLevel.toLowerCase(), msg: message, ts: new Date().toISOString() })
  }
  protected stringifyMessage(message: unknown): string {
    return this.formatMessage('log', message)
  }
}

async function bootstrap() {
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET must be set — copy web/.env.example to web/.env')
  }

  const app = await NestFactory.create(AppModule, {
    logger: new JsonLogger(),
  })

  const isProd = process.env.NODE_ENV === 'production'
  if (isProd) app.getHttpAdapter().getInstance().set('trust proxy', 1)

  app.use(helmet())

  fs.mkdirSync('./data', { recursive: true })
  const db = new DatabaseSync('./data/sessions.db')
  db.exec('CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, expires INTEGER, data TEXT, created_at INTEGER)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires)')

  app.use(
    session({
      store: new SQLiteStore({ db, ttl: 7 * 86400 }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        secure: isProd,
        sameSite: isProd ? 'lax' : false,
      },
    }),
  )

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))

  if (!isProd) {
    const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:6173'
    app.enableCors({ origin: corsOrigin, credentials: true })
  }

  const port = process.env.PORT ?? 3001
  await app.listen(port, '0.0.0.0')
  process.stdout.write(JSON.stringify({ level: 'info', msg: 'Server started', port, ts: new Date().toISOString() }) + '\n')
}
bootstrap().catch(err => {
  process.stderr.write(JSON.stringify({ level: 'error', msg: 'Failed to start', error: (err as Error).message, ts: new Date().toISOString() }) + '\n')
  process.exit(1)
})
