import {InformationPage} from "@/components/site/InformationPage";

export default function CookiesPage(){return <InformationPage title="Cookies & local storage">
  <section className="space-y-2"><h2 className="text-xl font-semibold">Sign-in cookies</h2><p>The vantory_session cookie maintains your signed-in session for up to seven days. It is HttpOnly, uses SameSite=Lax, and is Secure in production. Google sign-in uses temporary state to complete its authentication flow.</p></section>
  <section className="space-y-2"><h2 className="text-xl font-semibold">Local drafts</h2><p>The resume editor, coding exercises, and Career Studio can keep drafts in local storage on this device so work can be recovered. Local drafts can remain after signing out. Clearing site data removes local drafts and can sign you out, but does not delete records already saved to your account.</p></section>
  <section className="space-y-2"><h2 className="text-xl font-semibold">Your controls</h2><p>Use your browser’s site-data settings to inspect or clear cookies and local storage. Save work to your account before clearing local data. Blocking sign-in cookies prevents authenticated features from working.</p></section>
</InformationPage>;}
