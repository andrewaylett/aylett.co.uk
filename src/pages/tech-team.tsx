import React from 'react';

import Head from 'next/head';
import { match } from 'fp-ts/Either';
import { failures } from 'io-ts';
import { PathReporter } from 'io-ts/PathReporter';
import { DateTime } from 'luxon';

import { TechTeamRotaProps } from '../types';

import type { getStaticProps } from '../ssr/tech-team';
import type { TechTeamEpoch, TechTeamOverride } from '../types';
import type { InferGetStaticPropsType } from 'next';
import type { Errors, TypeOf } from 'io-ts';

import styles from '../index.module.scss';

export { getStaticProps } from '../ssr/tech-team';

const lastSunday = (): DateTime => DateTime.utc().startOf('week').minus({ days: 1 });

const weeksToConsider = (): DateTime[] => {
  let current = lastSunday().minus({ weeks: 3 });
  const result = [];
  while (result.length < 12) {
    result.push(current);
    current = current.plus({ weeks: 1 });
  }
  return result;
};

type PersonProps = { person: string; override: TechTeamOverride | undefined };
const Person: React.VoidFunctionComponent<PersonProps> = ({ override, person }) => {
  if (override) {
    return (
      <>
        <s>{person}</s> {override.name}
      </>
    );
  }
  return <>{person}</>;
};

type WeekRowProps = { week: DateTime; epoch: TechTeamEpoch; overrides: TechTeamOverride[] };
const WeekRow: React.VoidFunctionComponent<WeekRowProps> = ({ epoch, overrides, week }) => {
  const personId = Math.abs(week.diff(epoch.start).as('weeks')) % epoch.people.length;
  const person = epoch.people[personId].name;
  const override = overrides.find((candidate) => candidate.date.equals(week));
  return (
    <tr>
      <td>{week.toISODate()}</td>
      <td>
        <Person person={person} override={override} />
      </td>
    </tr>
  );
};

const TeamDescription: React.VoidFunctionComponent<TypeOf<typeof TechTeamRotaProps>> = ({ epochs, overrides }) => (
  <main>
    <h1 className={styles.title}>Niddrie Tech Rota</h1>

    <p className={styles.description}>
      Current team members: {epochs[epochs.length - 1].people.map(({ name }) => name).join(', ')}
    </p>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Tech</th>
        </tr>
      </thead>
      <tbody />
      {weeksToConsider().map((week) => (
        <WeekRow week={week} epoch={epochs[epochs.length - 1]} overrides={overrides} />
      ))}
    </table>
  </main>
);

const InvalidProps: React.VoidFunctionComponent<Errors> = ({ ...errors }) => (
  <main>
    <h1>Error</h1>
    <p>Invalid props passed from server: {PathReporter.report(failures(errors))}</p>
  </main>
);

const matcher = match<Errors, TypeOf<typeof TechTeamRotaProps>, React.ReactElement<any, any> | null>(
  InvalidProps,
  TeamDescription
);

const MatchProps: React.VoidFunctionComponent<InferGetStaticPropsType<typeof getStaticProps>> = (props) =>
  matcher(TechTeamRotaProps.decode(props));

// noinspection HtmlUnknownTarget
export const Home: React.VoidFunctionComponent<InferGetStaticPropsType<typeof getStaticProps>> = ({ ...props }) => (
  <div className={styles.container}>
    <Head>
      <title>Niddrie Tech Rota</title>
      <link rel="icon" href="/favicon.ico" />
    </Head>

    <MatchProps {...props} />
  </div>
);

export default Home;
