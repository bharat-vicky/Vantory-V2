import {InformationPage} from "@/components/site/InformationPage";

export default function SecurityPage(){return <InformationPage title="Security information">
  <section className="space-y-2"><h2 className="text-xl font-semibold">Account protections</h2><p>Passwords are hashed. Sessions use an HttpOnly cookie, with the Secure flag in production. Sensitive routes check account roles and ownership. Authentication endpoints limit repeated attempts using counters shared in the database.</p></section>
  <section className="space-y-2"><h2 className="text-xl font-semibold">Protect your account</h2><p>Use a unique password. Do not share verification or reset links. Sign out on shared devices and clear local drafts when appropriate. The desktop account menu also offers Sign out all devices.</p></section>
  <section className="space-y-2"><h2 className="text-xl font-semibold">Report a problem</h2><p>Open Contact Us and select Technical Issue / Bug Report. Describe the affected feature and steps to reproduce it. Never include passwords, API keys, private access tokens, or another person’s data in the report.</p></section>
</InformationPage>;}
