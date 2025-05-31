// middleware.ts  –– keep in the project root (Next 13/14)             
import { NextRequest, NextResponse } from 'next/server'

const BAD  = 'x-whop-dev-user-token'   // header the partner is sending
const GOOD = 'x-whop-user-token' // header your code expects

export function middleware(req: NextRequest) {
  const badValue = req.headers.get(BAD)
  const goodValue = req.headers.get(GOOD)

  // Only rewrite if the bad header is present and the good one isn't
  if (badValue && !req.headers.has(GOOD)) {
    const headers = new Headers(req.headers)
    headers.set(GOOD, badValue)   // add the "good" header
    headers.delete(BAD)           // (optional) strip the bad one

    // Return the same request with new headers
    return NextResponse.next({ request: { headers } })
  }

  return NextResponse.next()
}
