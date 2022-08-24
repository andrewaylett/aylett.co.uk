import React from 'react';

import Head from 'next/head';

import type { InferGetStaticPropsType } from 'next';

import styles from '../index.module.scss';

// noinspection HtmlUnknownTarget
export const Home: React.VoidFunctionComponent<InferGetStaticPropsType<void>> = () => (
  <div className={styles.container}>
    <Head>
      <title>Niddrie Tech Rota</title>
      <link rel="icon" href="/favicon.ico" />
    </Head>
    <main>
      <h1 className={styles.title}>Links</h1>

      <p className={styles.description}>
        <a href="https://photos.app.goo.gl/tRwdQNpn5j15PKJJ7">Lizzie&apos;s Photos</a>
      </p>
    </main>
  </div>
);

export default Home;
