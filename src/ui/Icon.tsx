import type { SVGProps } from 'react';

/** Small stroke icon set, 24px grid, 1.75 stroke, round caps. Matches the exercise line art. */
const paths: Record<string, string> = {
  today: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  plan: 'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11ZM4 9h16M9 4v3M15 4v3M8 13h2M14 13h2M8 16.5h2',
  progress: 'M4 19h16M6.5 15.5l4-4.5 3 2.5 4.5-6',
  settings: 'M5 7h9M18 7h1M5 17h1M10 17h9M16 5v4M8 15v4',
  chevronRight: 'M9.5 6l6 6-6 6',
  chevronLeft: 'M14.5 6l-6 6 6 6',
  chevronDown: 'M6 9.5l6 6 6-6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6 6 18',
  swap: 'M7 7h11l-3-3M17 17H6l3 3',
  play: 'M8 5.5v13l10.5-6.5L8 5.5Z',
  pause: 'M8.5 5.5v13M15.5 5.5v13',
  clock: 'M12 7v5l3 2M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z',
  calendar: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7ZM4 10h16M9 3v4M15 3v4',
  download: 'M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14',
  upload: 'M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19h14',
  info: 'M12 11v5M12 8v.01M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z',
  alert: 'M12 9v4M12 16.5v.01M10.3 4.2 3.2 17a2 2 0 0 0 1.7 3h14.2a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z',
  skip: 'M6 6l8 6-8 6V6ZM18 6v12',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  run: 'M13.5 5.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM9 21l2.5-5.5L14 17v4M7 12l2-4 4 1 2.5 3.5H19M11.5 15.5 13 9',
  dumbbell: 'M6.5 8v8M17.5 8v8M4 10v4M20 10v4M6.5 12h11',
  ball: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM5 7.5c3.5 1.5 4.5 6 3 10.5M19 16.5c-3.5-1.5-4.5-6-3-10.5',
  stretch: 'M12 5.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM5 10l7 1 7-1M12 11v4l-4 6M12 15l4 6',
  rest: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z',
  bolt: 'M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  trash: 'M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12',
  sun: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z',
};

export type IconName = keyof typeof paths;

export function Icon({ name, size = 22, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
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
      <path d={paths[name]} />
    </svg>
  );
}
