// Presentation-only split for the reviewed Hyperkalemia shift action. These
// exact source strings are guards, not alternate clinical content. If the
// maintained engine changes its wording, the view keeps its full summary.
const RECOMMENDATIONS = Object.freeze([
  'K ≥6.5: UKKA recommends insulin/glucose (1B).',
  'K 6.0–6.4: UKKA suggests insulin/glucose (2C); this is not the same recommendation strength as severe hyperkalemia.',
]);
const INSULIN_GLUCOSE = 'Regular insulin 10 units IV + glucose 25 g IV.';
const MONITORING = 'Check baseline glucose; arrange surveillance.';
const ADJUNCT = 'Salbutamol 10–20 mg nebulized: adjunct only.';

export function hyperkalemiaShiftPresentation(guideId, action) {
  if (guideId !== 'hyperkalemia' || action?.id !== 'shift' || typeof action.summary !== 'string') return null;
  const recommendation = RECOMMENDATIONS.find((text) =>
    action.summary === `${text} ${INSULIN_GLUCOSE} ${MONITORING} ${ADJUNCT}`);
  if (!recommendation) return null;

  // Extract from the source summary so the presented copy is the source copy.
  const recommendationText = action.summary.slice(0, recommendation.length);
  let offset = recommendation.length + 1;
  const insulinGlucose = action.summary.slice(offset, offset + INSULIN_GLUCOSE.length);
  offset += INSULIN_GLUCOSE.length;
  offset += 1;
  const monitoring = action.summary.slice(offset, offset + MONITORING.length);
  offset += MONITORING.length;
  offset += 1;
  const adjunct = action.summary.slice(offset);
  return { recommendation: recommendationText, insulinGlucose, monitoring, adjunct };
}
