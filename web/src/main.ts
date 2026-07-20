import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const session = require('express-session')

async function bootstrap() {
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET must be set — copy web/.env.example to web/.env')
  }

  const app = await NestFactory.create(AppModule)

  app.use(
    session({
      secret: process.env.SESSION_SECRET ?? 'dev-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
    }),
  )

  // Only enable CORS in development
  if (process.env.NODE_ENV !== 'production') {
    const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:6173'
    app.enableCors({ origin: corsOrigin, credentials: true })
  }

  const port = process.env.PORT ?? 6000
  await app.listen(port, '0.0.0.0')
  console.log(`Server running on http://0.0.0.0:${port}`)
}
bootstrap()
