import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Workout = {
  title: string;
  focus?: string;
  minutes?: number;
  difficulty?: string;
  reason?: string;
};

type WorkoutState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; suggestions: Workout[] };

const userEmail = 'mona@example.com';

export default function Workouts() {
  const [state, setState] = useState<WorkoutState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getJson<{ suggestions: Workout[] }>(`/api/workouts/suggestions/${encodeURIComponent(userEmail)}`)
      .then(({ suggestions }) => {
        if (active) setState({ status: 'success', suggestions });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unable to load workout suggestions.',
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
        <h2 className="h4">Workout suggestions</h2>
        <p>Recommend workouts from activity patterns.</p>
        {state.status === 'loading' && <p role="status">Loading workout suggestions...</p>}
        {state.status === 'error' && <p role="alert">Unable to load workout suggestions: {state.message}</p>}
        {state.status === 'success' && state.suggestions.length === 0 && <p>No workout suggestions yet.</p>}
        {state.status === 'success' && state.suggestions.length > 0 && (
          <ul>
            {state.suggestions.map((workout) => (
              <li key={workout.title}>
                <strong>{workout.title}</strong>
                {workout.focus && ` — ${workout.focus}`}
                {workout.minutes !== undefined && `, ${workout.minutes} minutes`}
                {workout.difficulty && ` (${workout.difficulty})`}
                {workout.reason && <p>{workout.reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
