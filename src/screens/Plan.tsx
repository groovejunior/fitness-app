import { navigate, useRoute } from '../lib/router';
import { Screen } from '../ui/Layout';
import { Month } from './plan/Month';
import { TestSegmented } from './plan/shared';
import { Week } from './plan/Week';

type View = 'month' | 'week';

export function Plan() {
  const { query } = useRoute();
  const view: View = query.get('view') === 'month' ? 'month' : 'week';
  return (
    <Screen title="Plan">
      <TestSegmented<View>
        value={view}
        onChange={(v) => navigate(`/plan?view=${v}`, { replace: true })}
        options={[
          { value: 'month', label: 'Month', testId: 'plan-view-month' },
          { value: 'week', label: 'Week', testId: 'plan-view-week' },
        ]}
      />
      <div className="mt-5">{view === 'month' ? <Month /> : <Week />}</div>
    </Screen>
  );
}
