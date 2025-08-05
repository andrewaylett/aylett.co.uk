/* eslint-disable unicorn/prefer-string-raw */
import { type NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: [
    '/((?!api|_next/static|favicon.ico)[^A-Z]*[A-Z](?!.*\\.(?:js|css)(?:\\.map)?$).*)',
  ],
};

export default function middleware(req: NextRequest): NextResponse {
  if (req.nextUrl.pathname === req.nextUrl.pathname.toLowerCase()) {
    return NextResponse.next();
  }

  return NextResponse.redirect(
    new URL(req.nextUrl.origin + req.nextUrl.pathname.toLowerCase()),
  );
}
