// Minimal stroke icons (24×24, 1.75 stroke), drawn for this app.
import type { SVGProps } from 'react';

const PATHS: Record<string, string> = {
  today: 'M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  plan: 'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5zM4 9.5h16M8.5 2.5v3M15.5 2.5v3',
  progress: 'M4 19.5h16M6.5 16v-4M11 16V8M15.5 16v-6M20 16V5',
  settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M9 14.5v5',
  'chevron-right': 'M9.5 6l6 6-6 6',
  'chevron-left': 'M14.5 6l-6 6 6 6',
  'chevron-down': 'M6 9.5l6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6L6 18',
  clock: 'M12 7v5l3 2M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z',
  swap: 'M7 4.5L4 7.5l3 3M4 7.5h12.5M17 13.5l3 3-3 3M20 16.5H7.5',
  play: 'M8 5.5v13l10.5-6.5z',
  pause: 'M8.5 5.5v13M15.5 5.5v13',
  skip: 'M6 5.5l9 6.5-9 6.5zM18 5.5v13',
  info: 'M12 11v5.5M12 7.6v.1M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z',
  warning: 'M12 9.5v4M12 16.6v.1M10.3 4.2L2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z',
  download: 'M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14',
  upload: 'M12 15V4M7.5 8.5L12 4l4.5 4.5M5 19.5h14',
  calendar: 'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5zM4 9.5h16M8 13h2M12 13h2M16 13h.5M8 16.5h2M12 16.5h2',
  gym: 'M3.5 9.5v5M6.5 7v10M17.5 7v10M20.5 9.5v5M6.5 12h11',
  run: 'M13.5 5.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM8 21l3-6.5 3 2.5v4.5M6.5 11.5l3-3.5h4l2.5 3.5 3 1M11 14.5l1.5-6.5',
  sport: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM5.5 6.5c3 2.5 3 8.5 0 11M18.5 6.5c-3 2.5-3 8.5 0 11',
  mobility: 'M12 6a1.75 1.75 0 1 0 0-3.5A1.75 1.75 0 0 0 12 6zM4 10.5c3 1 5.5 1.2 8 1.2s5-.2 8-1.2M12 11.7v3.8M12 15.5l-4.5 5M12 15.5l4.5 5',
  rest: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  dots: 'M6 12h.01M12 12h.01M18 12h.01',
  edit: 'M4.5 19.5l1-4L15.8 5.2a2 2 0 0 1 2.9 0l.1.1a2 2 0 0 1 0 2.9L8.5 18.5zM13.5 7.5l3 3',
  move: 'M12 3.5v17M8.5 7L12 3.5 15.5 7M8.5 17l3.5 3.5 3.5-3.5',
  trash: 'M5 7h14M10 4h4M7 7l1 12.5h8L17 7',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20.5h7M10 17h4',
  flame: 'M12 21c3.6 0 6-2.4 6-5.8 0-3.9-3.2-5.7-4.2-9.7-2.3 1.6-3.3 3.8-3.1 6-1.2-.6-2-1.8-2.2-3.2C7 9.8 6 11.7 6 15.2 6 18.6 8.4 21 12 21z',
  refresh: 'M19.5 12a7.5 7.5 0 0 1-13.1 5M4.5 12a7.5 7.5 0 0 1 13.1-5M17.6 3.5V7h-3.5M6.4 20.5V17h3.5',
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, ...rest }: { name: IconName | string; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d={PATHS[name] ?? PATHS.info} />
    </svg>
  );
}
