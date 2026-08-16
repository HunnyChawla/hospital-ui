/**
 * Quick-select complaints for a general OPD.
 *
 * The eye panel's list is `commonComplaints` in the optometrist mock templates
 * — blurred vision, floaters, foreign body sensation. Offering those to a
 * general physician would be worse than offering nothing: the buttons are the
 * fast path, so a wrong list pushes every real complaint into the free-text
 * box.
 *
 * Deliberately short and non-specialist. These are presentations, not
 * diagnoses, and anything not here is typed in.
 *
 * NOT a per-tenant configuration yet. When a hospital asks to edit this it
 * should become one — the symptom master (`/symptoms`) already exists and is
 * the natural home. Until then, a hard-coded list of the fifteen commonest
 * reasons someone walks into an OPD beats an empty panel.
 */
export const GENERAL_COMPLAINTS = [
    "Fever",
    "Cough",
    "Cold / runny nose",
    "Sore throat",
    "Headache",
    "Body ache",
    "Abdominal pain",
    "Vomiting",
    "Loose motions",
    "Breathlessness",
    "Chest pain",
    "Giddiness",
    "Weakness / fatigue",
    "Back pain",
    "Joint pain",
];
