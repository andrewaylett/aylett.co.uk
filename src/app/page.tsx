import * as React from 'react';

import Link from 'next/link';

import styles from './index.module.css';

import 'server-only';

// noinspection JSUnusedGlobalSymbols
export default function Home(): React.ReactNode {
  return (
    <div className={styles.container}>
      <main>
        <h1 className={styles.title}>Welcome to aylett.co.uk</h1>

        <p className={styles.description}>
          Insert &apos;90s &ldquo;site under construction&rdquo; gif here.
        </p>
        <p className={styles.description}>
          <Link href="articles">Articles</Link>
        </p>
        <p className={styles.description}>
          <Link href="thoughts">Thoughts</Link>
        </p>
        <p className={styles.description}>
          <Link href="schema">Schemas</Link>
        </p>
        <p className={styles.description}>
          <Link href="links">Links</Link>
        </p>
      </main>
    </div>
  );
}
