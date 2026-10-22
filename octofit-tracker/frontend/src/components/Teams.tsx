import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Team = {
  name: string;
  mascot?: string;
  members: string[];
};

type TeamState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; teams: Team[] };

export default function Teams() {
  const [state, setState] = useState<TeamState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getJson<{ teams: Team[] }>('/api/teams')
      .then(({ teams }) => {
        if (active) setState({ status: 'success', teams });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unable to load teams.',
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="card">
      <div className="card-body">
        <h2 className="h4">Teams</h2>
        <p>Manage teams and members.</p>
        {state.status === 'loading' && <p role="status">Loading teams...</p>}
        {state.status === 'error' && <p role="alert">Unable to load teams: {state.message}</p>}
        {state.status === 'success' && state.teams.length === 0 && <p>No teams yet.</p>}
        {state.status === 'success' && state.teams.length > 0 && (
          <ul>
            {state.teams.map((team) => (
              <li key={team.name}>
                <strong>{team.name}</strong>
                {team.mascot && ` — ${team.mascot}`}
                <span> ({team.members.length} members)</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
