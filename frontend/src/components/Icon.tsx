import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';
import { colors, type ColorToken } from '../theme';

/**
 * Line icon set (24×24 grid, 2px stroke, round caps). Glyphs are adapted from
 * Feather/Lucide (MIT/ISC). Keep strokes at 2px — thinner lines break up on
 * low-DPI screens.
 */
type Shape =
  | ['path', string]
  | ['circle', number, number, number]
  | ['line', number, number, number, number]
  | ['polyline', string]
  | ['polygon', string]
  | ['rect', number, number, number, number, number];

const ICONS = {
  home: [['path', 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'], ['polyline', '9 22 9 12 15 12 15 22']],
  book: [
    ['path', 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z'],
    ['path', 'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'],
  ],
  user: [['path', 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'], ['circle', 12, 7, 4]],
  users: [
    ['path', 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'],
    ['circle', 9, 7, 4],
    ['path', 'M23 21v-2a4 4 0 0 0-3-3.87'],
    ['path', 'M16 3.13a4 4 0 0 1 0 7.75'],
  ],
  bolt: [['polygon', '13 2 3 14 12 14 11 22 21 10 12 10 13 2']],
  clock: [['circle', 12, 12, 10], ['polyline', '12 6 12 12 16 14']],
  flag: [['path', 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z'], ['line', 4, 22, 4, 15]],
  check: [['polyline', '20 6 9 17 4 12']],
  x: [['line', 18, 6, 6, 18], ['line', 6, 6, 18, 18]],
  chevronLeft: [['polyline', '15 18 9 12 15 6']],
  chevronRight: [['polyline', '9 18 15 12 9 6']],
  chevronDown: [['polyline', '6 9 12 15 18 9']],
  chevronUp: [['polyline', '18 15 12 9 6 15']],
  arrowRight: [['line', 5, 12, 19, 12], ['polyline', '12 5 19 12 12 19']],
  lock: [['rect', 3, 11, 18, 11, 2], ['path', 'M7 11V7a5 5 0 0 1 10 0v4']],
  wifiOff: [
    ['line', 1, 1, 23, 23],
    ['path', 'M16.72 11.06A10.94 10.94 0 0 1 19 12.55'],
    ['path', 'M5 12.55a10.94 10.94 0 0 1 5.17-2.39'],
    ['path', 'M10.71 5.05A16 16 0 0 1 22.58 9'],
    ['path', 'M1.42 9a15.91 15.91 0 0 1 4.7-2.88'],
    ['path', 'M8.53 16.11a6 6 0 0 1 6.95 0'],
    ['line', 12, 20, 12.01, 20],
  ],
  share: [
    ['circle', 18, 5, 3],
    ['circle', 6, 12, 3],
    ['circle', 18, 19, 3],
    ['line', 8.59, 13.51, 15.42, 17.49],
    ['line', 15.41, 6.51, 8.59, 10.49],
  ],
  link: [
    ['path', 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'],
    ['path', 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'],
  ],
  mail: [
    ['path', 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z'],
    ['polyline', '22,6 12,13 2,6'],
  ],
  eye: [['path', 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'], ['circle', 12, 12, 3]],
  eyeOff: [
    [
      'path',
      'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24',
    ],
    ['line', 1, 1, 23, 23],
  ],
  grid: [['rect', 3, 3, 7, 7, 1], ['rect', 14, 3, 7, 7, 1], ['rect', 14, 14, 7, 7, 1], ['rect', 3, 14, 7, 7, 1]],
  star: [['polygon', '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2']],
  award: [['circle', 12, 8, 7], ['polyline', '8.21 13.89 7 23 12 20 17 23 15.79 13.88']],
  refresh: [
    ['polyline', '23 4 23 10 17 10'],
    ['polyline', '1 20 1 14 7 14'],
    ['path', 'M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15'],
  ],
  target: [['circle', 12, 12, 10], ['circle', 12, 12, 6], ['circle', 12, 12, 2]],
  chart: [['line', 18, 20, 18, 10], ['line', 12, 20, 12, 4], ['line', 6, 20, 6, 14]],
  card: [['rect', 1, 4, 22, 16, 2], ['line', 1, 10, 23, 10]],
  copy: [['rect', 9, 9, 13, 13, 2], ['path', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1']],
  search: [['circle', 11, 11, 8], ['line', 21, 21, 16.65, 16.65]],
  alert: [['circle', 12, 12, 10], ['line', 12, 8, 12, 12], ['line', 12, 16, 12.01, 16]],
  phone: [['rect', 5, 2, 14, 20, 2], ['line', 12, 18, 12.01, 18]],
  hash: [['line', 4, 9, 20, 9], ['line', 4, 15, 20, 15], ['line', 10, 3, 8, 21], ['line', 16, 3, 14, 21]],
  bank: [['path', 'M3 21h18M5 21V10M19 21V10M9.5 21V10M14.5 21V10M2 10l10-7 10 7z']],
  pencil: [['path', 'M12 20h9'], ['path', 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z']],
  sparkles: [
    ['path', 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z'],
    ['path', 'M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z'],
  ],
  flame: [
    [
      'path',
      'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z',
    ],
  ],
  swords: [
    ['polyline', '14.5 17.5 3 6 3 3 6 3 17.5 14.5'],
    ['line', 13, 19, 19, 13],
    ['line', 16, 16, 20, 20],
    ['line', 19, 21, 21, 19],
    ['polyline', '14.5 6.5 18 3 21 3 21 6 17.5 9.5'],
    ['line', 5, 14, 9, 18],
    ['line', 7, 17, 4, 20],
    ['line', 3, 19, 5, 21],
  ],
  gem: [['path', 'M6 3h12l4 6-10 13L2 9Z'], ['path', 'M11 3 8 9l4 13 4-13-3-6'], ['path', 'M2 9h20']],
  trophy: [
    ['path', 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6'],
    ['path', 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18'],
    ['path', 'M4 22h16'],
    ['path', 'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22'],
    ['path', 'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22'],
    ['path', 'M18 2H6v7a6 6 0 0 0 12 0V2Z'],
  ],
  crown: [['path', 'm2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14']],
  message: [
    [
      'path',
      'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z',
    ],
  ],
  play: [['polygon', '6 3 20 12 6 21 6 3']],
  list: [
    ['line', 8, 6, 21, 6],
    ['line', 8, 12, 21, 12],
    ['line', 8, 18, 21, 18],
    ['line', 3, 6, 3.01, 6],
    ['line', 3, 12, 3.01, 12],
    ['line', 3, 18, 3.01, 18],
  ],
  bookmark: [['path', 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z']],
  plus: [['line', 12, 5, 12, 19], ['line', 5, 12, 19, 12]],
  minus: [['line', 5, 12, 19, 12]],
  shield: [['path', 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z']],
  download: [
    ['path', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'],
    ['polyline', '7 10 12 15 17 10'],
    ['line', 12, 15, 12, 3],
  ],
  layers: [
    ['polygon', '12 2 2 7 12 12 22 7 12 2'],
    ['polyline', '2 17 12 22 22 17'],
    ['polyline', '2 12 12 17 22 12'],
  ],
  thumbsUp: [
    ['path', 'M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3'],
  ],
  thumbsDown: [
    [
      'path',
      'M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17',
    ],
  ],
  moon: [['path', 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z']],
  sun: [
    ['circle', 12, 12, 5],
    ['line', 12, 1, 12, 3],
    ['line', 12, 21, 12, 23],
    ['line', 4.22, 4.22, 5.64, 5.64],
    ['line', 18.36, 18.36, 19.78, 19.78],
    ['line', 1, 12, 3, 12],
    ['line', 21, 12, 23, 12],
    ['line', 4.22, 19.78, 5.64, 18.36],
    ['line', 18.36, 5.64, 19.78, 4.22],
  ],
  calendar: [['rect', 3, 4, 18, 18, 2], ['line', 16, 2, 16, 6], ['line', 8, 2, 8, 6], ['line', 3, 10, 21, 10]],
  bell: [['path', 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9'], ['path', 'M13.73 21a2 2 0 0 1-3.46 0']],
  logOut: [['path', 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'], ['polyline', '16 17 21 12 16 7'], ['line', 21, 12, 9, 12]],
  settings: [
    ['circle', 12, 12, 3],
    [
      'path',
      'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    ],
  ],
  externalLink: [
    ['path', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'],
    ['polyline', '15 3 21 3 21 9'],
    ['line', 10, 14, 21, 3],
  ],
  /* Subject icons — Lucide v1.77.0 (ISC), exact path data from lucide-static.
     Figma uses Lucide throughout (layers named lucide/*); the 10 Figma subjects
     use the same glyphs, see src/practice/subjects.ts. */
  calculator: [['rect', 4, 2, 16, 20, 2], ['line', 8, 6, 16, 6], ['line', 16, 14, 16, 18], ['path', 'M16 10h.01'], ['path', 'M12 10h.01'], ['path', 'M8 10h.01'], ['path', 'M12 14h.01'], ['path', 'M8 14h.01'], ['path', 'M12 18h.01'], ['path', 'M8 18h.01']],
  bookText: [['path', 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20'], ['path', 'M8 11h8'], ['path', 'M8 7h6']],
  bookOpenText: [['path', 'M12 5v16'], ['path', 'M16 13h2'], ['path', 'M16 9h2'], ['path', 'M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z'], ['path', 'M6 13h2'], ['path', 'M6 9h2']],
  atom: [['circle', 12, 12, 1], ['path', 'M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z'], ['path', 'M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z']],
  flaskConical: [['path', 'M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2'], ['path', 'M6.453 15h11.094'], ['path', 'M8.5 2h7']],
  dna: [['path', 'm10 16 1.5 1.5'], ['path', 'm14 8-1.5-1.5'], ['path', 'M15 2c-1.798 1.998-2.518 3.995-2.807 5.993'], ['path', 'm16.5 10.5 1 1'], ['path', 'm17 6-2.891-2.891'], ['path', 'M2 15c6.667-6 13.333 0 20-6'], ['path', 'm20 9 .891.891'], ['path', 'M3.109 14.109 4 15'], ['path', 'm6.5 12.5 1 1'], ['path', 'm7 18 2.891 2.891'], ['path', 'M9 22c1.798-1.998 2.518-3.995 2.807-5.993']],
  scale: [['path', 'M12 3v18'], ['path', 'm19 8 3 8a5 5 0 0 1-6 0zV7'], ['path', 'M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1'], ['path', 'm5 8 3 8a5 5 0 0 1-6 0zV7'], ['path', 'M7 21h10']],
  landmark: [['path', 'M10 18v-7'], ['path', 'M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z'], ['path', 'M14 18v-7'], ['path', 'M18 18v-7'], ['path', 'M3 22h18'], ['path', 'M6 18v-7']],
  globe: [['circle', 12, 12, 10], ['path', 'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20'], ['path', 'M2 12h20']],
  leaf: [['path', 'M11 20a10 10 0 0010-10 25.9 25.9 0 00-1.04-7.281 1 1 0 00-1.755-.325C15.833 5.5 13 5.5 9.8 6.1A7 7 0 0011 20'], ['path', 'M2 21a5 5 0 012.911-4.544C7.613 15.212 8.351 15.24 11 13']],
  church: [['path', 'M10 9h4'], ['path', 'M12 7v5'], ['path', 'M14 21v-3a2 2 0 0 0-4 0v3'], ['path', 'm18 9 3.52 2.147a1 1 0 0 1 .48.854V19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6.999a1 1 0 0 1 .48-.854L6 9'], ['path', 'M6 21V7a1 1 0 0 1 .376-.782l5-3.999a1 1 0 0 1 1.249.001l5 4A1 1 0 0 1 18 7v14']],
  moonStar: [['path', 'M18 5h4'], ['path', 'M20 3v4'], ['path', 'M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401']],
  store: [['path', 'M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5'], ['path', 'M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244'], ['path', 'M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05']],
  receipt: [['path', 'M12 17V7'], ['path', 'M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8'], ['path', 'M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z']],
  palette: [['path', 'M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z'], ['circle', 13.5, 6.5, 0.5], ['circle', 17.5, 10.5, 0.5], ['circle', 6.5, 12.5, 0.5], ['circle', 8.5, 7.5, 0.5]],
  languages: [['path', 'm5 8 6 6'], ['path', 'm4 14 6-6 2-3'], ['path', 'M2 5h12'], ['path', 'M7 2h1'], ['path', 'm22 22-5-10-5 10'], ['path', 'M14 18h6']],
  scrollText: [['path', 'M15 12h-5'], ['path', 'M15 8h-5'], ['path', 'M19 17V5a2 2 0 0 0-2-2H4'], ['path', 'M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3']],
  shieldCheck: [['path', 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'], ['path', 'm9 12 2 2 4-4']],
  megaphone: [['path', 'M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z'], ['path', 'M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14'], ['path', 'M8 6v8']],
  music: [['path', 'M21 16V3a1 1 0 0 0-1.28-.96l-10 2.917a1 1 0 0 0-.72.96V19'], ['circle', 18, 16, 3], ['circle', 6, 19, 3]],
  briefcase: [['path', 'M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16'], ['rect', 2, 6, 20, 14, 2]],
  package: [['path', 'M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z'], ['path', 'M12 22V12'], ['polyline', '3.29 7 12 12 20.71 7'], ['path', 'm7.5 4.27 9 5.15']],
  sigma: [['path', 'M18 7V5a1 1 0 0 0-1-1H6.5a.5.5 0 0 0-.4.8l4.5 6a2 2 0 0 1 0 2.4l-4.5 6a.5.5 0 0 0 .4.8H17a1 1 0 0 0 1-1v-2']],
  monitor: [['rect', 2, 3, 20, 14, 2], ['line', 8, 21, 16, 21], ['line', 12, 17, 12, 21]],
  vote: [['path', 'm9 12 2 2 4-4'], ['path', 'M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7Z'], ['path', 'M22 19H2']],
} satisfies Record<string, Shape[]>;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorToken;
  /** Raw colour override (e.g. third-party brand colours). */
  rawColor?: string;
  /** Fill the glyph with its stroke colour (used for flame, bolt, star, gem). */
  filled?: boolean;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, color = 'text', rawColor, filled = false, strokeWidth = 2 }: IconProps) {
  const stroke = rawColor ?? colors[color];
  const fill = filled ? stroke : 'none';
  const common = { stroke, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', fill } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {(ICONS[name] as Shape[]).map((shape, i) => {
        switch (shape[0]) {
          case 'path':
            return <Path key={i} d={shape[1]} {...common} />;
          case 'circle':
            return <Circle key={i} cx={shape[1]} cy={shape[2]} r={shape[3]} {...common} />;
          case 'line':
            return <Line key={i} x1={shape[1]} y1={shape[2]} x2={shape[3]} y2={shape[4]} {...common} />;
          case 'polyline':
            return <Polyline key={i} points={shape[1]} {...common} fill="none" />;
          case 'polygon':
            return <Polygon key={i} points={shape[1]} {...common} />;
          case 'rect':
            return <Rect key={i} x={shape[1]} y={shape[2]} width={shape[3]} height={shape[4]} rx={shape[5]} {...common} />;
        }
      })}
    </Svg>
  );
}
