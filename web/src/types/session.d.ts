import 'express-session'
import { SessionToken } from '../auth/session-token.interface'

declare module 'express-session' {
  interface SessionData {
    token: SessionToken
  }
}
