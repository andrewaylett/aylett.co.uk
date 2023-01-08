export const GITHUB_URL = (pageName: string): string =>
  `https://github.com/andrewaylett/aylett.co.uk/commits/main/src/pages${pageName.replace(
    /#.*/,
    ''
  )}.md`;
