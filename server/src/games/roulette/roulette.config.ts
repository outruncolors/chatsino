export type RouletteBetKind =
  | "straight-up"
  | "line"
  | "column"
  | "dozen"
  | "even-odd"
  | "red-black"
  | "high-low";

export const RED_NUMBERS = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];

export const BLACK_NUMBERS = [
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
];

export const LINES = {
  1: [1, 2, 3, 4, 5, 6],
  2: [7, 8, 9, 10, 11, 12],
  3: [13, 14, 15, 16, 17, 18],
  4: [19, 20, 31, 22, 23, 24],
  5: [25, 26, 27, 28, 29, 30],
  6: [31, 32, 33, 34, 35, 36],
};

export const COLUMNS = {
  1: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  2: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  3: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
};

export const DOZENS = {
  1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  2: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  3: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
};

export const PAYOUT_MULTIPLIERS: Record<RouletteBetKind, number> = {
  "straight-up": 35,
  line: 5,
  column: 2,
  dozen: 2,
  "even-odd": 1,
  "red-black": 1,
  "high-low": 1,
};

export const TAKING_BETS_DURATION = 60 * 15; // 15 minutes

export const NO_MORE_BETS_DURATION = 8; // 8 seconds

export const SPINNING_DURATION = 5; // 5 seconds
