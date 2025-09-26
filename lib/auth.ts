import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

export async function verifyAuth(request: NextRequest): Promise<string | null> {
  try {
    const authorization = request.headers.get('authorization')

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return null
    }

    const token = authorization.split(' ')[1]
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key'

    try {
      const decoded = jwt.verify(token, jwtSecret) as {
        userId?: string
        id?: string
        username: string
        email: string
        role?: string
        isAdmin?: boolean
      }

      // userId 또는 id 필드에서 사용자 ID 반환
      return decoded.userId || decoded.id || null
    } catch (error) {
      console.error('Token verification error:', error)
      return null
    }
  } catch (error) {
    console.error('Auth verification error:', error)
    return null
  }
}