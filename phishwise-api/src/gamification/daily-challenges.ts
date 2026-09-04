export interface DailyChallenge {
  id: string;
  title: string;
  desc: string;
  options: string[];
  answer: number;
  xp: number;
}

export const DAILY_CHALLENGES: DailyChallenge[] = [
  {
    id: 'dc-1',
    title: 'Spot the Phish',
    desc: "An email from 'apple.support@icloud-verify.net' asks you to confirm your Apple ID. Is the sender domain legitimate?",
    options: [
      'Yes — it mentions iCloud',
      'No — the registered domain is icloud-verify.net, not apple.com',
    ],
    answer: 1,
    xp: 30,
  },
  {
    id: 'dc-2',
    title: 'Password Showdown',
    desc: "Which would take longer to crack: 'Tr0ub4dor!' or 'correct-horse-battery-staple'?",
    options: [
      'Tr0ub4dor! — it has symbols',
      'correct-horse-battery-staple — length beats complexity',
    ],
    answer: 1,
    xp: 30,
  },
  {
    id: 'dc-3',
    title: 'OTP Trap',
    desc: "A caller from 'your bank' asks you to read out the code just texted to you, to 'cancel a fraudulent transfer'. Do you read it?",
    options: [
      'Yes — it cancels the fraud',
      "Never — reading out an OTP authorises the attacker's transaction",
    ],
    answer: 1,
    xp: 30,
  },
];

/** Deterministic per-day selection, matching the original frontend logic. */
export function todaysChallenge(): DailyChallenge {
  const day = Math.floor(Date.now() / 86400000);
  return DAILY_CHALLENGES[day % DAILY_CHALLENGES.length];
}
