/**
 * Full WAEC/NECO theory questions with marking-scheme style worked solutions.
 * Server-only: the app bundles each part's prompt and first step (the free
 * preview) and fetches the rest from GET /questions/theory/:id/solution, which
 * requires a paid plan (PRD §5.8).
 */
export interface TheoryStep {
  title: string;
  body: string;
  /** Worked line(s) shown in a monospace "working" box. */
  working?: string;
  marks?: number;
}

export interface TheoryPart {
  label: string;
  prompt: string;
  marks: number;
  steps: TheoryStep[];
  answer: string;
}

export interface TheoryQuestion {
  id: string;
  subject: string;
  examBody: 'WAEC' | 'NECO';
  year: number;
  topic: string;
  stem: string;
  parts: TheoryPart[];
}

export const THEORY_QUESTIONS: TheoryQuestion[] = [
  {
    id: 'waec-math-theory-1',
    subject: 'Mathematics',
    examBody: 'WAEC',
    year: 2019,
    topic: 'Quadratic equations',
    stem: 'The length of a rectangular plot is 5 m more than its width. The area of the plot is 84 m².',
    parts: [
      {
        label: '(a)',
        prompt: 'Form an equation in terms of the width, x.',
        marks: 2,
        steps: [
          { title: 'Name the unknowns', body: 'Let the width be x metres. The length is 5 m more, so it is (x + 5) m.', marks: 1 },
          { title: 'Use the area formula', body: 'Area = length × width, and the area is 84 m².', working: 'x(x + 5) = 84\nx² + 5x − 84 = 0', marks: 1 },
        ],
        answer: 'x² + 5x − 84 = 0',
      },
      {
        label: '(b)',
        prompt: 'Find the dimensions of the plot.',
        marks: 4,
        steps: [
          { title: 'Factorise', body: 'Find two numbers that multiply to −84 and add to +5: they are +12 and −7.', working: '(x + 12)(x − 7) = 0', marks: 2 },
          { title: 'Solve', body: 'Set each bracket to zero.', working: 'x = −12  or  x = 7', marks: 1 },
          { title: 'Reject the impossible root', body: 'A width cannot be negative, so x = 7. The length is 7 + 5 = 12.', marks: 1 },
        ],
        answer: 'Width = 7 m, length = 12 m',
      },
    ],
  },
  {
    id: 'waec-phy-theory-1',
    subject: 'Physics',
    examBody: 'WAEC',
    year: 2021,
    topic: 'Projectile motion',
    stem: 'A ball is thrown vertically upwards with a speed of 20 m s⁻¹. (Take g = 10 m s⁻².)',
    parts: [
      {
        label: '(a)',
        prompt: 'Calculate the maximum height reached.',
        marks: 3,
        steps: [
          { title: 'List what you know', body: 'At maximum height the final velocity is zero.', working: 'u = 20 m s⁻¹, v = 0, a = −10 m s⁻²', marks: 1 },
          { title: 'Choose the equation', body: 'Use v² = u² + 2as, since time is not given.', working: '0 = 20² − 2(10)s', marks: 1 },
          { title: 'Solve for s', body: 'Rearrange and divide.', working: '20s = 400  →  s = 20 m', marks: 1 },
        ],
        answer: '20 m',
      },
      {
        label: '(b)',
        prompt: 'Find the total time of flight.',
        marks: 2,
        steps: [
          { title: 'Time to the top', body: 'Use v = u + at.', working: '0 = 20 − 10t  →  t = 2 s', marks: 1 },
          { title: 'Up and down are symmetric', body: 'It takes the same time to fall back, so double it.', working: 'T = 2 × 2 = 4 s', marks: 1 },
        ],
        answer: '4 s',
      },
    ],
  },
  {
    id: 'neco-chem-theory-1',
    subject: 'Chemistry',
    examBody: 'NECO',
    year: 2020,
    topic: 'Mole concept',
    stem: '4.0 g of sodium hydroxide is dissolved in water to make 250 cm³ of solution. [Na = 23, O = 16, H = 1]',
    parts: [
      {
        label: '(a)',
        prompt: 'Calculate the molar mass of NaOH.',
        marks: 1,
        steps: [{ title: 'Add the relative atomic masses', body: 'One atom each of Na, O and H.', working: '23 + 16 + 1 = 40 g mol⁻¹', marks: 1 }],
        answer: '40 g mol⁻¹',
      },
      {
        label: '(b)',
        prompt: 'Calculate the concentration of the solution in mol dm⁻³.',
        marks: 3,
        steps: [
          { title: 'Find the number of moles', body: 'moles = mass ÷ molar mass.', working: 'n = 4.0 ÷ 40 = 0.10 mol', marks: 1 },
          { title: 'Convert the volume to dm³', body: '1 dm³ = 1000 cm³.', working: '250 cm³ = 0.250 dm³', marks: 1 },
          { title: 'Divide moles by volume', body: 'Concentration = n ÷ V.', working: 'C = 0.10 ÷ 0.250 = 0.40 mol dm⁻³', marks: 1 },
        ],
        answer: '0.40 mol dm⁻³',
      },
    ],
  },
  {
    id: 'waec-eco-theory-1',
    subject: 'Economics',
    examBody: 'WAEC',
    year: 2018,
    topic: 'Elasticity of demand',
    stem: 'When the price of a bag of rice rose from ₦20,000 to ₦25,000, the quantity demanded fell from 100 bags to 90 bags.',
    parts: [
      {
        label: '(a)',
        prompt: 'Calculate the price elasticity of demand.',
        marks: 3,
        steps: [
          { title: '% change in quantity', body: 'Change ÷ original × 100.', working: '(90 − 100) ÷ 100 × 100 = −10%', marks: 1 },
          { title: '% change in price', body: 'Change ÷ original × 100.', working: '(25,000 − 20,000) ÷ 20,000 × 100 = 25%', marks: 1 },
          { title: 'Divide', body: 'PED = %ΔQ ÷ %ΔP (quote the absolute value).', working: '|−10 ÷ 25| = 0.4', marks: 1 },
        ],
        answer: '0.4',
      },
      {
        label: '(b)',
        prompt: 'Is the demand for rice elastic or inelastic? Give a reason.',
        marks: 2,
        steps: [
          { title: 'Compare with 1', body: 'PED below 1 means quantity changes proportionally less than price.', marks: 1 },
          { title: 'Link to the good', body: 'Rice is a staple with few close substitutes, so buyers keep buying it.', marks: 1 },
        ],
        answer: 'Inelastic (0.4 < 1) — rice is a necessity with few substitutes.',
      },
    ],
  },
];
