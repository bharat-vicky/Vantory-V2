export interface StudentRawMetrics {
  profileCompletionScore: number;
  resumesCount: number;
  atsScansCount: number;
  averageAtsScore: number;
  interviewsCount: number;
  averageInterviewScore: number;
}

export interface StudentReadinessBreakdown {
  isProfileReady: boolean;
  isResumeReady: boolean;
  isAtsReady: boolean;
  isInterviewReady: boolean;
  isPlacementReady: boolean;
  readinessCategory: "Checklist Complete" | "Needs Improvement" | "Not Ready";
}

export interface InstitutionReadinessFunnel {
  totalStudents: number;
  profileCompleteCount: number;
  resumeReadyCount: number;
  atsReadyCount: number;
  interviewReadyCount: number;
  placementReadyCount: number;
  placedCount: number;
}

/**
 * Calculates deterministic placement readiness breakdown for an individual student.
 */
export function calculateStudentReadiness(
  metrics: StudentRawMetrics
): StudentReadinessBreakdown {
  const isProfileReady = metrics.profileCompletionScore >= 80;
  const isResumeReady = metrics.resumesCount >= 1;
  const isAtsReady = metrics.atsScansCount >= 1 && metrics.averageAtsScore >= 75;
  const isInterviewReady =
    metrics.interviewsCount >= 1 && metrics.averageInterviewScore >= 70;

  const isPlacementReady =
    isProfileReady && isResumeReady && isAtsReady && isInterviewReady;

  let readyPoints = 0;
  if (isProfileReady) readyPoints++;
  if (isResumeReady) readyPoints++;
  if (isAtsReady) readyPoints++;
  if (isInterviewReady) readyPoints++;

  let readinessCategory: "Checklist Complete" | "Needs Improvement" | "Not Ready" =
    "Not Ready";
  if (isPlacementReady) {
    readinessCategory = "Checklist Complete";
  } else if (readyPoints >= 2) {
    readinessCategory = "Needs Improvement";
  }

  return {
    isProfileReady,
    isResumeReady,
    isAtsReady,
    isInterviewReady,
    isPlacementReady,
    readinessCategory,
  };
}

/**
 * Aggregates student metrics into an institution-level placement funnel.
 */
export function aggregateInstitutionFunnel(
  students: Array<StudentRawMetrics & { isPlaced?: boolean }>
): InstitutionReadinessFunnel {
  let profileCompleteCount = 0;
  let resumeReadyCount = 0;
  let atsReadyCount = 0;
  let interviewReadyCount = 0;
  let placementReadyCount = 0;
  let placedCount = 0;

  for (const s of students) {
    const r = calculateStudentReadiness(s);
    if (r.isProfileReady) profileCompleteCount++;
    if (r.isResumeReady) resumeReadyCount++;
    if (r.isAtsReady) atsReadyCount++;
    if (r.isInterviewReady) interviewReadyCount++;
    if (r.isPlacementReady) placementReadyCount++;
    if (s.isPlaced) placedCount++;
  }

  return {
    totalStudents: students.length,
    profileCompleteCount,
    resumeReadyCount,
    atsReadyCount,
    interviewReadyCount,
    placementReadyCount,
    placedCount,
  };
}
