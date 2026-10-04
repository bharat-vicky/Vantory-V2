export const ApplicationState = {
  APPLIED: "APPLIED",
  UNDER_REVIEW: "UNDER_REVIEW",
  SHORTLISTED: "SHORTLISTED",
  INTERVIEW: "INTERVIEW",
  SELECTED: "SELECTED",
  OFFERED: "OFFERED",
  REJECTED: "REJECTED",
  WITHDRAWN: "WITHDRAWN",
} as const;

export type ApplicationState = (typeof ApplicationState)[keyof typeof ApplicationState];

export function isApplicationState(value: unknown): value is ApplicationState {
  return typeof value === "string" && Object.values(ApplicationState).includes(value as ApplicationState);
}

export const APPLICATION_TRANSITIONS: Record<string, readonly string[]> = {
  APPLIED: ["UNDER_REVIEW", "SHORTLISTED", "REJECTED"],
  UNDER_REVIEW: ["SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["INTERVIEW", "REJECTED"],
  INTERVIEW: ["SELECTED", "OFFERED", "REJECTED"],
  SELECTED: ["OFFERED", "REJECTED"],
  OFFERED: [], REJECTED: [], WITHDRAWN: [],
};
