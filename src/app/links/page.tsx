import * as React from 'react';

import Head from 'next/head';
import Link from 'next/link';
import 'server-only';

import styles from '../../index.module.css';

// noinspection JSUnusedGlobalSymbols
export default function Links(): React.ReactNode {
  return (
    <div className={styles.container}>
      <Head>
        <title>Links</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <nav>
          <Link href="/">Home</Link>
        </nav>
        <h1 className={styles.title}>Links</h1>

        <p className={styles.description}>
          <a href="https://photos.app.goo.gl/tRwdQNpn5j15PKJJ7">Lizzie&apos;s Photos</a>
        </p>
      </main>
    </div>
  );
}
