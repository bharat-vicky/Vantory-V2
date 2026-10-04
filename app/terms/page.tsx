import {InformationPage} from "@/components/site/InformationPage";

export default function TermsPage(){return <InformationPage title="Usage guidelines">
  <section className="space-y-2"><h2 className="text-xl font-semibold">Accurate candidate information</h2><p>Use information you can support in your profile, resume, and applications. Review generated drafts before saving or submitting them. Practice scores and AI feedback are learning aids; they do not verify qualifications or predict a hiring decision.</p></section>
  <section className="space-y-2"><h2 className="text-xl font-semibold">Responsible use</h2><p>Use your own account and protect your sign-in details. Do not attempt to access another person’s records, bypass platform controls, or submit malicious files or code. Practice code runs only when a separate execution service is configured.</p></section>
  <section className="space-y-2"><h2 className="text-xl font-semibold">Applications and availability</h2><p>Check the employer, job details, and selected resume before submitting an application. Employer decisions are managed by the employer. Features that depend on AI, email, or code-execution services can be unavailable; the interface will show an error or unavailable state.</p></section>
  <p>Contact platform support through Contact Us for service or account questions.</p>
</InformationPage>;}
