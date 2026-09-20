import { LegalScreenLayout, LegalSection } from "@/components/LegalScreenLayout";

export default function PrivacyScreen() {
  return (
    <LegalScreenLayout title="Privacy Policy" lastUpdated="[DATE]">
      <LegalSection title="1. Who we are">
        GymCrew is operated by [COMPANY NAME], [COMPANY ADDRESS] (“we”, “us”). This policy explains
        what data we collect through the GymCrew app and gymcrew.site, why, and what rights you have
        over it. For any privacy question or request, contact [CONTACT EMAIL].
      </LegalSection>

      <LegalSection title="2. What we collect">
        Account: your name, email address, and profile photo, via our authentication provider,
        Clerk. We never see or store your password ourselves.{"\n\n"}
        Fitness profile: gender, height, weight, age, home gym, training goal, and experience level.
        {"\n\n"}
        Activity data: workouts you log (exercises, sets, reps, weight), body-weight and body-fat
        entries, progress photos you choose to upload, nutrition entries (foods, meals, barcodes
        scanned; meal photos you scan with the AI meal scan are analysed and not stored), and Crew activity (messages/events visible to your Crew).{"\n\n"}
        Social/Crew data: the Crew(s) you create or join, your role, and your activity within them —
        visible to your fellow Crew members, and to other users if a Crew is set to “Public”.{"\n\n"}
        Usage data: how you use the app, collected via our analytics provider PostHog (screens
        viewed, taps, general device info) — used to understand what&apos;s working and fix bugs, not
        to build an advertising profile.{"\n\n"}
        Crash data: if the app crashes, diagnostic information (device type, OS version, and the
        error itself) may be sent to our crash-reporting provider, Sentry, to help us fix it.
      </LegalSection>

      <LegalSection title="3. Why we collect it">
        To run the core features of the app (workout logging, the ranking system, Crew training, and
        progress tracking), to personalize what you see (e.g. rankings normalized for your bodyweight
        and gender), to keep the Service secure and working, and to improve it based on real usage
        and crash data.
      </LegalSection>

      <LegalSection title="4. Who we share it with">
        We do not sell your personal data. We share it only with the service providers that make
        GymCrew work, each acting under their own privacy terms:{"\n\n"}
        • Clerk — authentication and account security.{"\n"}
        • Hostinger — our database and file hosting.{"\n"}
        • PostHog — product analytics.{"\n"}
        • Sentry — crash and error reporting.{"\n"}
        • Open Food Facts — public nutrition database, queried when you scan a barcode (no personal
        data is sent to them beyond the barcode itself).{"\n"}
        • Google (Gemini) — analyses the photo when you use the AI meal scan. Only the photo is
        sent; we don&apos;t keep it, and we never send your name or account details with it.{"\n\n"}
        Your Crew name, activity, and (if you set your profile visible) fitness stats are shared with
        your fellow Crew members as a core part of how the Service works — that sharing is the
        product, not a third party.
      </LegalSection>

      <LegalSection title="5. How long we keep it">
        We keep your data for as long as your account is active. If you delete your account (Profile
        → Account → Delete Account), your profile, workout history, and Crew membership are
        permanently deleted from our database. Some data may remain briefly in backups or provider
        logs (e.g. Clerk, Sentry) before it&apos;s cycled out under their own retention schedules.
      </LegalSection>

      <LegalSection title="6. Your rights">
        Depending on where you live, you may have the right to access, correct, export, or delete
        your personal data, and to object to how it&apos;s processed. You can view and edit most of
        your data directly in the app (Profile), export isn&apos;t yet self-service — contact us and
        we&apos;ll help — and you can delete your account and all associated data at any time from
        Profile → Account. If you&apos;re in the EU/EEA or UK, you also have the right to lodge a
        complaint with your local data protection authority.
      </LegalSection>

      <LegalSection title="7. Children">
        GymCrew is not intended for anyone under 16. We do not knowingly collect data from children
        under that age. If you believe a child has created an account, contact us and we&apos;ll
        remove it.
      </LegalSection>

      <LegalSection title="8. Security">
        We use industry-standard measures to protect your data (encrypted connections, access
        controls, and a third-party authentication provider for credentials). No system is
        completely secure, but we work to keep your data safe and to fix issues quickly when they&apos;re
        found.
      </LegalSection>

      <LegalSection title="9. Changes to this policy">
        We may update this policy as the Service evolves. If we make a material change, we&apos;ll let
        you know in the app before it takes effect.
      </LegalSection>

      <LegalSection title="10. Contact">
        Questions, requests, or concerns about your data? Reach us at [CONTACT EMAIL].
      </LegalSection>
    </LegalScreenLayout>
  );
}
