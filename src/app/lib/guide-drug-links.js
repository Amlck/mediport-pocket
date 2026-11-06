// Curated monograph pointers for source-guide actions. These are reference
// navigation only: an action remains the guide's own reviewed wording, and a
// monograph is not proof of product, preparation, dose, or orderability.
// Each record pins the action id and title plus a positive wording anchor.
// Changing a pinned title or anchor, or removing/renaming a target, closes its link.
export const GUIDE_DRUG_LINKS = Object.freeze([
  { guideId: 'hyperkalemia', actionId: 'shift', titles: ['Lower potassium: insulin/glucose', 'Consider insulin/glucose'], anchor: 'Regular insulin 10 units IV + glucose 25 g IV.', drugId: 'insulin-regular', drugName: 'Regular Insulin (RI / Actrapid)' },
  { guideId: 'hyperkalemia', actionId: 'shift', titles: ['Lower potassium: insulin/glucose', 'Consider insulin/glucose'], anchor: 'Salbutamol 10–20 mg nebulized: adjunct only.', drugId: 'albuterol', drugName: 'Albuterol (Salbutamol)' },
  { guideId: 'hypoglycemia', actionId: 'im-glucagon', title: 'Use IM glucagon while obtaining IV access', anchor: '1 mg IM once; continue gaining IV access.', drugId: 'glucagon', drugName: 'Glucagon' },
  { guideId: 'anaphylaxis', actionId: 'initial-im-adrenaline', title: 'Initial adult IM adrenaline now', anchor: 'WAO criteria are met. 500 micrograms IM', drugId: 'epinephrine', drugName: 'Epinephrine (Adrenaline)' },
  { guideId: 'anaphylaxis', actionId: 'wao-criteria-met-severe-gi-im-adrenaline', title: 'WAO criteria met without current ABC findings: urgent adult IM-adrenaline treatment review', anchor: 'Adult IM adrenaline: 500 micrograms', drugId: 'epinephrine', drugName: 'Epinephrine (Adrenaline)' },
  { guideId: 'anaphylaxis', actionId: 'continue-im-adrenaline-every-five-minutes-while-escalating', title: 'While expert infusion support is arranged, continue adult IM adrenaline every 5 minutes', anchor: 'Use the 5-minute IM interval for ongoing airway, breathing, or circulation symptoms', drugId: 'epinephrine', drugName: 'Epinephrine (Adrenaline)' },
  { guideId: 'hypocalcemia', actionId: 'initial-iv-calcium-gluconate', title: 'Start the monitored IV calcium-gluconate response', anchor: '10–20 mL 10% calcium gluconate', drugId: 'calcium-gluconate', drugName: 'Calcium Gluconate' },
  { guideId: 'hypocalcemia', actionId: 'post-iv-calcium-gluconate-continuation-review', title: 'Review post-bolus calcium-gluconate continuation', anchor: '100 mL of 10% calcium gluconate', drugId: 'calcium-gluconate', drugName: 'Calcium Gluconate' },
  { guideId: 'hypermagnesemia', actionId: 'calcium-antagonizes-toxic-effects', title: 'Use IV calcium only under the local emergency protocol', anchor: '2.2 mmol calcium gluconate', drugId: 'calcium-gluconate', drugName: 'Calcium Gluconate' },
  { guideId: 'hypomagnesemia', actionId: 'severe-magnesium-needs-hospital-review', title: 'Severe magnesium deficit needs hospital IV review', anchor: 'IV magnesium sulfate in hospital', drugId: 'magnesium-sulfate', drugName: 'Magnesium Sulfate' },
  { guideId: 'hypomagnesemia', actionId: 'urgent-neurologic-or-cardiac-feature', title: 'Escalate the severe feature in monitored care', anchor: 'hospital IV magnesium sulfate', drugId: 'magnesium-sulfate', drugName: 'Magnesium Sulfate' },
  { guideId: 'acute-severe-asthma', actionId: 'mild-initial-bronchodilator', title: 'Mild rescue: salbutamol 4 puffs by pMDI/spacer', anchor: 'salbutamol 4 puffs by pMDI/spacer', drugId: 'albuterol', drugName: 'Albuterol (Salbutamol)' },
  { guideId: 'acute-severe-asthma', actionId: 'severe-initial-bronchodilator', title: 'Severe rescue: salbutamol 6–10 puffs + ipratropium 4 puffs, or nebulized 5 mg + 0.25 mg', anchor: 'salbutamol 6–10 puffs and ipratropium 4 puffs', drugId: 'albuterol', drugName: 'Albuterol (Salbutamol)' },
  { guideId: 'acute-severe-asthma', actionId: 'severe-initial-bronchodilator', title: 'Severe rescue: salbutamol 6–10 puffs + ipratropium 4 puffs, or nebulized 5 mg + 0.25 mg', anchor: 'salbutamol 6–10 puffs and ipratropium 4 puffs', drugId: 'ipratropium', drugName: 'Ipratropium Bromide' },
  { guideId: 'acute-severe-asthma', actionId: 'moderate-initial-bronchodilator', title: 'Moderate rescue: salbutamol 4–6 puffs + ipratropium 4 puffs, or nebulized 2.5 mg + 0.25 mg', anchor: 'salbutamol 4–6 puffs plus ipratropium 4 puffs', drugId: 'albuterol', drugName: 'Albuterol (Salbutamol)' },
  { guideId: 'acute-severe-asthma', actionId: 'moderate-initial-bronchodilator', title: 'Moderate rescue: salbutamol 4–6 puffs + ipratropium 4 puffs, or nebulized 2.5 mg + 0.25 mg', anchor: 'salbutamol 4–6 puffs plus ipratropium 4 puffs', drugId: 'ipratropium', drugName: 'Ipratropium Bromide' },
  { guideId: 'acute-severe-asthma', actionId: 'consider-iv-magnesium-after-nonresponse', title: 'Consider IV magnesium sulfate 2 g over 20 min after inadequate response', anchor: 'single 2 g IV infusion over 20 minutes', drugId: 'magnesium-sulfate', drugName: 'Magnesium Sulfate' },
  { guideId: 'acute-chest-pain-acs', actionId: 'aspirin-load', title: 'Aspirin 162–325 mg orally once', anchor: 'Use nonenteric aspirin; chew when possible.', drugId: 'aspirin', drugName: 'Aspirin (ASA)' },
  { guideId: 'acute-chest-pain-acs', actionId: 'nitrate-review', title: 'Consider sublingual nitroglycerin for ongoing pain', anchor: '0.3 or 0.4 mg SL every 5 min', drugId: 'nitroglycerin', drugName: 'Nitroglycerin' },
  { guideId: 'bradycardia', actionId: 'brady-atropine-first', title: 'Atropine 1 mg IV bolus', anchor: 'First dose only when no prior atropine is verified.', drugId: 'atropine', drugName: 'Atropine' },
  { guideId: 'bradycardia', actionId: 'brady-atropine-repeat', title: 'Atropine 1 mg IV repeat dose', anchor: 'Only after the verified 3–5 min interval', drugId: 'atropine', drugName: 'Atropine' },
  { guideId: 'bradycardia', actionId: 'brady-dopamine', title: 'Option: dopamine IV infusion', anchor: '5–20 mcg/kg/min; titrate to response.', drugId: 'dopamine', drugName: 'Dopamine' },
  { guideId: 'bradycardia', actionId: 'brady-epinephrine', title: 'Option: epinephrine IV infusion', anchor: '2–10 mcg/min; titrate to response.', drugId: 'epinephrine', drugName: 'Epinephrine (Adrenaline)' },
  { guideId: 'sepsis-septic-shock', actionId: 'time-sensitive-vasopressor-capable-resuscitation', title: 'Use vasopressor-capable resuscitation without access delay', anchor: 'Norepinephrine is first line', drugId: 'norepinephrine', drugName: 'Norepinephrine' },
  { guideId: 'hypokalemia', actionId: 'urgent-monitored-response', title: 'Escalate to monitored care', anchor: 'IV potassium chloride over 15–30 minutes', drugId: 'potassium-chloride', drugName: 'Potassium Chloride' },
]);

export function actionDrugReferences(guideId, action, drugs) {
  if (typeof guideId !== 'string' || !action || typeof action.id !== 'string' || !Array.isArray(drugs)) return [];
  const wording = [action.summary, action.detail].filter((value) => typeof value === 'string').join('\n');
  const references = [];
  for (const link of GUIDE_DRUG_LINKS) {
    if (link.guideId !== guideId || link.actionId !== action.id) continue;
    if (action.title !== link.title && !link.titles?.includes(action.title)) continue;
    if (!wording.includes(link.anchor)) continue;
    const drug = drugs.find((item) => item?.id === link.drugId && item.name === link.drugName);
    if (!drug) continue;
    references.push({ id: drug.id, name: drug.name, href: `#/drugs/${drug.id}` });
  }
  return references;
}
