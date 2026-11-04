import { useNavigate } from 'react-router-dom';
import { ScreenHeader, Segmented } from '../../ui';

/** Title plus the Month / Week switch, shared by both plan screens. */
export function PlanHeader({ active }: { active: 'month' | 'week' }) {
  const nav = useNavigate();
  return (
    <>
      <ScreenHeader title="Plan" />
      <div className="px-5 pb-5">
        <Segmented
          ariaLabel="Plan view"
          options={[
            { value: 'month', label: 'Month' },
            { value: 'week', label: 'Week' },
          ]}
          value={active}
          onChange={(v) => v !== active && nav(`/plan/${v}`, { replace: true })}
        />
      </div>
    </>
  );
}
