import * as React from 'react';

import Link from 'next/link';

import type { Metadata } from 'next';

import 'server-only';

import styles from '../index.module.css';

// noinspection JSUnusedGlobalSymbols
export const metadata: Metadata = {
  title: 'Links',
};

// noinspection JSUnusedGlobalSymbols
export default function Links(): React.ReactNode {
  return (
    <div className={styles.container}>
      <main>
        <nav>
          <Link href="/">Home</Link>
        </nav>
        <h1 className={styles.title}>Links</h1>

        <p className={styles.description}>
          <a href="https://photos.app.goo.gl/tRwdQNpn5j15PKJJ7">
            Lizzie&apos;s Photos
          </a>
        </p>
      </main>
    </div>
  );
}
