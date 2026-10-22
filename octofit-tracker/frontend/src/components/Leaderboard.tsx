import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Entry = {
  teamName: string;
  totalPoints: number;
  rank: number;
};

type LeaderboardState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; leaderboard: Entry[] };

export default function Leaderboard() {
  const [state, setState] = useState<LeaderboardState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getJson<{ leaderboard: Entry[] }>('/api/leaderboard')
      .then(({ leaderboard }) => {
        if (active) setState({ status: 'success', leaderboard });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unable to load leaderboard.',
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
        <h2 className="h4">Leaderboard</h2>
        <p>Compare team point totals.</p>
        {state.status === 'loading' && <p role="status">Loading leaderboard...</p>}
        {state.status === 'error' && <p role="alert">Unable to load leaderboard: {state.message}</p>}
        {state.status === 'success' && state.leaderboard.length === 0 && <p>No rankings yet.</p>}
        {state.status === 'success' && state.leaderboard.length > 0 && (
          <ol>
            {state.leaderboard.map((entry) => (
              <li key={entry.teamName}>
                {entry.teamName}: {entry.totalPoints} points
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
