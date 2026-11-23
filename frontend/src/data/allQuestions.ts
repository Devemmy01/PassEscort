import necoQuestions from './necoQuestions.json';
import waecQuestions from './waecQuestions.json';
import waecArtsCommercialQuestions from './waecArtsCommercialQuestions.json';
import necoArtsCommercialQuestions from './necoArtsCommercialQuestions.json';
import waecElectiveQuestions from './waecElectiveQuestions.json';
import necoElectiveQuestions from './necoElectiveQuestions.json';
import jambQuestions from './jambQuestions.json';
import jambArtsCommercialQuestions from './jambArtsCommercialQuestions.json';
import jambElectiveQuestions from './jambElectiveQuestions.json';
import type { QuestionInput } from '../types/question';

/**
 * Combined seed dataset for the on-device question bank — the same files the
 * server seeds from (backend `npm run seed`), so every question the app shows
 * can be scored by the server. (sampleQuestions.json is only the engine's
 * own test fixture and is not shipped.) necoQuestions/waecQuestions/jambQuestions are the real, curated per-exam-body
 * practice sets covering the app's six initial (Science/Commercial) subjects.
 * The *ArtsCommercialQuestions files extend all three exam bodies to the Arts
 * (Government, Literature-in-English, History, CRS, IRS, Geography) and
 * remaining Commercial (Financial Accounting, Commerce, Office Practice)
 * subjects. The *ElectiveQuestions files add further electives (Fine Arts,
 * Music, French, Store Management, Insurance, Marketing) to all three exam
 * bodies, giving WAEC/NECO/JAMB symmetric coverage across all 20 subjects.
 */
export const allSeedQuestions: QuestionInput[] = [
  ...(necoQuestions as QuestionInput[]),
  ...(waecQuestions as QuestionInput[]),
  ...(waecArtsCommercialQuestions as QuestionInput[]),
  ...(necoArtsCommercialQuestions as QuestionInput[]),
  ...(waecElectiveQuestions as QuestionInput[]),
  ...(necoElectiveQuestions as QuestionInput[]),
  ...(jambQuestions as QuestionInput[]),
  ...(jambArtsCommercialQuestions as QuestionInput[]),
  ...(jambElectiveQuestions as QuestionInput[]),
];
