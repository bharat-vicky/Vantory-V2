/** Keep every preparation step tied to the complete employer supplied description. */
export function jobPreparationDescription(job: {
  description: string;
  requirements?: string | null;
  preferredRequirements?: string | null;
  skills?: string | null;
}): string {
  return [
    job.description.trim(),
    job.requirements?.trim() && `Required qualifications:\n${job.requirements.trim()}`,
    job.preferredRequirements?.trim() && `Preferred qualifications:\n${job.preferredRequirements.trim()}`,
  ].filter(Boolean).join("\n\n");
}
