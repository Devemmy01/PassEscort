/**
 * WAEC/NECO theory questions — the free preview shipped in the app: each
 * part's prompt, marks and first step. The remaining steps and the
 * marking-scheme answer are paid content (PRD §5.8): they live on the server
 * (backend/src/data/theory.ts) and are fetched by paid students from
 * GET /questions/theory/:id/solution, so they can't be read out of the APK.
 * Generated from the server data — edit there, then regenerate.
 */
import type { TheoryStepDTO } from '../../../shared/api';

export type TheoryStep = TheoryStepDTO;

export interface TheoryPart {
  label: string;
  prompt: string;
  marks: number;
  /** Steps in the full solution (the preview carries only the first). */
  stepCount: number;
  steps: TheoryStep[];
  /** Present only once the full solution is loaded. */
  answer?: string;
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
    "id": "waec-math-theory-1",
    "subject": "Mathematics",
    "examBody": "WAEC",
    "year": 2019,
    "topic": "Quadratic equations",
    "stem": "The length of a rectangular plot is 5 m more than its width. The area of the plot is 84 m².",
    "parts": [
      {
        "label": "(a)",
        "prompt": "Form an equation in terms of the width, x.",
        "marks": 2,
        "stepCount": 2,
        "steps": [
          {
            "title": "Name the unknowns",
            "body": "Let the width be x metres. The length is 5 m more, so it is (x + 5) m.",
            "marks": 1
          }
        ]
      },
      {
        "label": "(b)",
        "prompt": "Find the dimensions of the plot.",
        "marks": 4,
        "stepCount": 3,
        "steps": [
          {
            "title": "Factorise",
            "body": "Find two numbers that multiply to −84 and add to +5: they are +12 and −7.",
            "working": "(x + 12)(x − 7) = 0",
            "marks": 2
          }
        ]
      }
    ]
  },
  {
    "id": "waec-phy-theory-1",
    "subject": "Physics",
    "examBody": "WAEC",
    "year": 2021,
    "topic": "Projectile motion",
    "stem": "A ball is thrown vertically upwards with a speed of 20 m s⁻¹. (Take g = 10 m s⁻².)",
    "parts": [
      {
        "label": "(a)",
        "prompt": "Calculate the maximum height reached.",
        "marks": 3,
        "stepCount": 3,
        "steps": [
          {
            "title": "List what you know",
            "body": "At maximum height the final velocity is zero.",
            "working": "u = 20 m s⁻¹, v = 0, a = −10 m s⁻²",
            "marks": 1
          }
        ]
      },
      {
        "label": "(b)",
        "prompt": "Find the total time of flight.",
        "marks": 2,
        "stepCount": 2,
        "steps": [
          {
            "title": "Time to the top",
            "body": "Use v = u + at.",
            "working": "0 = 20 − 10t  →  t = 2 s",
            "marks": 1
          }
        ]
      }
    ]
  },
  {
    "id": "neco-chem-theory-1",
    "subject": "Chemistry",
    "examBody": "NECO",
    "year": 2020,
    "topic": "Mole concept",
    "stem": "4.0 g of sodium hydroxide is dissolved in water to make 250 cm³ of solution. [Na = 23, O = 16, H = 1]",
    "parts": [
      {
        "label": "(a)",
        "prompt": "Calculate the molar mass of NaOH.",
        "marks": 1,
        "stepCount": 1,
        "steps": [
          {
            "title": "Add the relative atomic masses",
            "body": "One atom each of Na, O and H.",
            "working": "23 + 16 + 1 = 40 g mol⁻¹",
            "marks": 1
          }
        ]
      },
      {
        "label": "(b)",
        "prompt": "Calculate the concentration of the solution in mol dm⁻³.",
        "marks": 3,
        "stepCount": 3,
        "steps": [
          {
            "title": "Find the number of moles",
            "body": "moles = mass ÷ molar mass.",
            "working": "n = 4.0 ÷ 40 = 0.10 mol",
            "marks": 1
          }
        ]
      }
    ]
  },
  {
    "id": "waec-eco-theory-1",
    "subject": "Economics",
    "examBody": "WAEC",
    "year": 2018,
    "topic": "Elasticity of demand",
    "stem": "When the price of a bag of rice rose from ₦20,000 to ₦25,000, the quantity demanded fell from 100 bags to 90 bags.",
    "parts": [
      {
        "label": "(a)",
        "prompt": "Calculate the price elasticity of demand.",
        "marks": 3,
        "stepCount": 3,
        "steps": [
          {
            "title": "% change in quantity",
            "body": "Change ÷ original × 100.",
            "working": "(90 − 100) ÷ 100 × 100 = −10%",
            "marks": 1
          }
        ]
      },
      {
        "label": "(b)",
        "prompt": "Is the demand for rice elastic or inelastic? Give a reason.",
        "marks": 2,
        "stepCount": 2,
        "steps": [
          {
            "title": "Compare with 1",
            "body": "PED below 1 means quantity changes proportionally less than price.",
            "marks": 1
          }
        ]
      }
    ]
  }
];

export function theoryFor(examBody: 'WAEC' | 'NECO', subject: string): TheoryQuestion[] {
  const exact = THEORY_QUESTIONS.filter((q) => q.subject === subject);
  return exact.length ? exact : THEORY_QUESTIONS.filter((q) => q.examBody === examBody);
}
