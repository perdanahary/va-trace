import { next } from '@vercel/edge'

export const config = {
  matcher: '/(.*)',
}

export default function middleware(request: Request) {
  const basicAuth = request.headers.get('authorization')

  if (basicAuth) {
    const auth = basicAuth.split(' ')[1]
    const [user, pwd] = atob(auth).split(':')

    if (user === 'admin' && pwd === 'admin123') {
      return next()
    }
  }

  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="VA Trace"',
    },
  })
}
