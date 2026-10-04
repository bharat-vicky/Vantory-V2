export interface ReportInputs {
  resumeId: string;
  uploadedResumeText: string;
  targetJobTitle: string;
  companyName: string;
  jobDescription: string;
}

export function reportInputKey(input: ReportInputs): string {
  return JSON.stringify([input.resumeId, input.uploadedResumeText, input.targetJobTitle.trim(), input.companyName.trim(), input.jobDescription.trim()]);
}

export function reportMatchesRevision(savedRevision?: string, currentRevision?: string): boolean {
  return !savedRevision || !currentRevision || savedRevision === currentRevision;
}
