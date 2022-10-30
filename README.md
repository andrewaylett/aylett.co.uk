# The aylett.co.uk Website

This is the source for the website hosted at https://www.aylett.co.uk/.

It uses Typescript and Next.js, and deploys automatically to Vercel.

We use React 18 SSR to try to avoid needing to load code on the client.

Articles placed in `src/app/articles` with a `.md` extension will be
picked up automatically.
Please make sure to include a YAML block at the top of the document so that the
rendering and listing code knows what to render and list.
We default to a title matching the file name and Andrew being the author.
