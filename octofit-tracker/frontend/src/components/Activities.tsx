import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Activity = {
  type: string;
  minutes: number;
  points: number;
};

type ActivityState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; activities: Activity[] };

export default function Activities() {
  const [state, setState] = useState<ActivityState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getJson<{ activities: Activity[] }>('/api/activities')
      .then(({ activities }) => {
        if (active) setState({ status: 'success', activities });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unable to load activities.',
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
        <h2 className="h4">Activities</h2>
        <p>Track student activity minutes and points.</p>
        {state.status === 'loading' && <p role="status">Loading activities...</p>}
        {state.status === 'error' && <p role="alert">Unable to load activities: {state.message}</p>}
        {state.status === 'success' && state.activities.length === 0 && <p>No activities yet.</p>}
        {state.status === 'success' && state.activities.length > 0 && (
          <ul>
            {state.activities.map((activity, index) => (
              <li key={`${activity.type}-${index}`}>
                {activity.type}: {activity.minutes} minutes, {activity.points} points
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
