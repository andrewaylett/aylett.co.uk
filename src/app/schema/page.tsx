import * as React from 'react';

import styles from '../index.module.css';

import 'server-only';

// noinspection JSUnusedGlobalSymbols
export default function Schema(): React.ReactNode {
  return (
    <div className={styles.container}>
      <main>
        <h1 className={styles.title}>Schemas</h1>

        <p className={styles.description}>
          Totally non-standard, provided for convenience. Maintained as part of
          the{' '}
          <a href="https://github.com/andrewaylett/aylett.co.uk/tree/main/public/schema">
            website project on GitHub.
          </a>
        </p>
        <p className={styles.description}>
          If you&apos;re using any of them, please let me know. And please feel
          free to submit PRs to update/enhance/fix them.
        </p>
        <p className={styles.description}>
          <ol>
            <li>
              <a href="/schema/clientConfig-1.1.xsd">
                Autoconfig schema for email
              </a>
            </li>
            <li>
              <a href="/schema/drone-0.8.json">
                Schema for <code>.drone.yml</code> files targeting Drone 0.8
              </a>
            </li>
          </ol>
        </p>
      </main>
    </div>
  );
}
