import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { seedDemo } from '../../dev/seed';

/** Dev-only: #/dev/seed fills the app with demo data (wipes current data). ?empty=1 skips history. ?to=/plan/week redirects. */
export default function Seed() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [msg, setMsg] = useState('Seeding demo data…');
  useEffect(() => {
    seedDemo(params.get('empty') !== '1')
      .then(() => nav(params.get('to') ?? '/', { replace: true }))
      .catch((e) => setMsg(String(e)));
  }, [params, nav]);
  return <p className="p-8 text-body">{msg}</p>;
}
