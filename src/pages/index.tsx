import Head from 'next/head';
import Link from 'next/link';
import React from 'react';

import styles from '../index.module.scss';

// noinspection HtmlUnknownTarget
export const Home: React.VoidFunctionComponent = () => (
  <div className={styles.container}>
    <Head>
      <title>aylett.co.uk</title>
      <link rel="icon" href="/favicon.ico" />
    </Head>

    <main>
      <h1 className={styles.title}>Welcome to aylett.co.uk</h1>

      <p className={styles.description}>Insert &apos;90s &ldquo;site under construction&rdquo; gif here.</p>
      <p className={styles.description}>
        <Link href="/articles">Articles</Link>
      </p>
    </main>

    <footer>
      <a href="/_logs" target="_blank" rel="noopener noreferrer">
        Powered by <img src="/vercel.svg" alt="Vercel Logo" className={styles.logo} />
      </a>
    </footer>
  </div>
);

export default Home;
