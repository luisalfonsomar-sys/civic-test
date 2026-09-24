import { useNavigate } from "react-router-dom";
import { chevronLeft } from "../components/icons";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full shrink-0 flex-col items-start gap-2">
      <p className="w-full font-extrabold text-[16px] text-ink">{title}</p>
      <div className="flex w-full shrink-0 flex-col items-start gap-2 text-[13px] leading-[1.5] text-slate">
        {children}
      </div>
    </div>
  );
}

export function PrivacyPolicyScreen() {
  const navigate = useNavigate();

  return (
    <div className="flex w-full flex-1 flex-col items-start overflow-y-auto">
      <div className="sticky top-0 z-10 flex w-full shrink-0 items-center gap-4 bg-cream px-6 py-3">
        <button
          aria-label="Back"
          className="flex size-6 shrink-0 items-center justify-center"
          onClick={() => navigate(-1)}
          type="button"
        >
          <img alt="" className="size-6 icon-invert" src={chevronLeft} />
        </button>
        <p className="font-extrabold text-[20px] text-ink">Privacy Policy</p>
      </div>

      <div className="flex w-full shrink-0 flex-col items-start gap-6 p-6 pb-10">
        <p className="w-full text-[12px] text-slate-light">Last updated: September 2026</p>

        <Section title="Overview">
          <p>
            This app is a self-contained study tool. It does not have a server, a user account
            system, or any backend of its own — everything it stores lives only in your browser,
            on this device, and is never transmitted anywhere.
          </p>
        </Section>

        <Section title="What we store, and where">
          <p>All of the following is saved locally in this browser's storage, on this device only:</p>
          <ul className="flex w-full flex-col gap-1 pl-4">
            <li className="list-disc">Your study progress — completed modules, category scores, and your review queue</li>
            <li className="list-disc">Your daily study streak</li>
            <li className="list-disc">App preferences, like the 65/20 track setting and theme</li>
          </ul>
          <p>
            None of this data is uploaded, synced, or shared. It never leaves your device. If you
            clear your browser's site data, uninstall the app, or use a different browser or
            device, this data won't carry over — there is no account to sign into that would
            restore it.
          </p>
        </Section>

        <Section title="What we don't do">
          <ul className="flex w-full flex-col gap-1 pl-4">
            <li className="list-disc">No account creation, sign-in, or password of any kind</li>
            <li className="list-disc">No analytics, ad tracking, or third-party trackers</li>
            <li className="list-disc">No advertising, and nothing is sold to third parties</li>
            <li className="list-disc">No collection of your name, email, or any other personal information</li>
          </ul>
        </Section>

        <Section title="Microphone use">
          <p>
            The Live Interview and Oral Practice features use your device's built-in speech
            recognition to turn what you say into text, entirely so the app can compare it to the
            accepted answers on screen. Audio is processed by your browser/operating system and is
            never recorded, saved, or sent to us — we only ever see the resulting transcript text,
            and only for as long as it takes to grade your answer.
          </p>
        </Section>

        <Section title="Your controls">
          <p>
            Everything this app stores about you is also entirely in your control. Settings →
            Reset All Progress permanently clears your module completion, scores, review queue,
            and streak from this device. You can also clear it at any time through your browser's
            own site-data settings — since nothing is stored anywhere else, that removes it
            completely.
          </p>
        </Section>

        <Section title="Children's privacy">
          <p>
            This app doesn't knowingly collect personal information from anyone, including
            children, because it doesn't collect personal information from anyone at all — there's
            no account system to collect it into.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If this app's data practices ever change — for example, if a future version adds an
            optional account or sync feature — this page will be updated to describe exactly what
            changed before that feature is available.
          </p>
        </Section>

        <Section title="Contact">
          <p>Questions about this policy can be directed to the developer via this app's store listing.</p>
        </Section>
      </div>
    </div>
  );
}
