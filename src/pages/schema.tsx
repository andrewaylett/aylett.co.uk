import Head from 'next/head';
import React from 'react';

import styles from '../index.module.scss';

// noinspection HtmlUnknownTarget
export const Home: React.VoidFunctionComponent = () => (
  <div className={styles.container}>
    <Head>
      <title>aylett.co.uk schemas</title>
      <link rel="icon" href="/favicon.ico" />
    </Head>

    <main>
      <h1 className={styles.title}>Schemas</h1>

      <p className={styles.description}>
        Totally non-standard, provided for convenience. Maintained as part of the{' '}
        <a href="https://github.com/andrewaylett/aylett.co.uk/tree/main/public/schema">website project on GitHub.</a>
      </p>
      <p className={styles.description}>
        If you&apos;re using any of them, please let me know. And please feel free to submit PRs to update/enhance/fix
        them.
      </p>
      <p className={styles.description}>
        <ol>
          <li>
            <a href="/schema/clientConfig-1.1.xsd">Autoconfig schema for email</a>
          </li>
          <li>
            <a href="/schema/drone-0.8.json">
              Schema for <pre>.drone.yml</pre> files targeting Drone 0.8
            </a>
          </li>
        </ol>
      </p>
    </main>
  </div>
);

export default Home;
