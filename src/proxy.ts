/**
 * Next.js middleware that redirects URLs containing uppercase characters to their
 * lowercase equivalent. The matcher regex excludes API routes, static files, and
 * already-lowercase paths.
 */
/* eslint-disable unicorn/prefer-string-raw */
import { type NextRequest, NextResponse } from 'next/server';

export const config: {
  matcher: string[];
} = {
  matcher: [
    '/((?!api|_next/static|favicon.ico)[^A-Z]*[A-Z](?!.*\\.(?:js|css)(?:\\.map)?$).*)',
  ],
};

export default function proxy(req: NextRequest): NextResponse {
  if (req.nextUrl.pathname === req.nextUrl.pathname.toLowerCase()) {
    return NextResponse.next();
  }

  return NextResponse.redirect(
    new URL(req.nextUrl.origin + req.nextUrl.pathname.toLowerCase()),
  );
}
