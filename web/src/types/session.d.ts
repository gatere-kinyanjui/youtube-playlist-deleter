import 'express-session'

declare module 'express-session' {
  interface SessionData {
    token: {
      access_token: string
      refresh_token: string
      expiry_date: number
    }
  }
}
