import { LegalScreenLayout, LegalSection } from "@/components/LegalScreenLayout";

export default function TermsScreen() {
  return (
    <LegalScreenLayout title="Terms of Service" lastUpdated="[DATE]">
      <LegalSection title="1. Agreement">
        These Terms of Service (“Terms”) govern your use of the GymCrew mobile app and the
        gymcrew.site website (together, the “Service”), operated by [COMPANY NAME] (“we”, “us”). By
        creating an account or using the Service, you agree to these Terms. If you do not agree, do
        not use the Service.
      </LegalSection>

      <LegalSection title="2. Who can use GymCrew">
        You must be at least 16 years old to create an account. By signing up you confirm that the
        information you provide (name, email, date of birth if requested, and any other profile
        details) is accurate and belongs to you.
      </LegalSection>

      <LegalSection title="3. Your account">
        You are responsible for keeping your login credentials secure and for all activity under your
        account. Authentication is handled by our third-party provider, Clerk — we never see or store
        your password ourselves. Tell us right away if you suspect unauthorized access to your account.
      </LegalSection>

      <LegalSection title="4. Crews and other users">
        GymCrew lets you form or join a “Crew” with other users, see their training activity, and
        compare progress. Anything you post as part of a Crew (its name, icon, activity, or your own
        profile content) is visible to other members of that Crew, and — if the Crew is set to
        “Public” — to other users of the Service.{"\n\n"}
        You agree not to use the Service to post content that is illegal, harassing, hateful,
        sexually explicit, or that impersonates another person. You can report a Crew or a member at
        any time from within the app; we may remove content or suspend accounts that violate these
        Terms.
      </LegalSection>

      <LegalSection title="5. Fitness and health disclaimer">
        GymCrew is a workout-tracking and social-fitness tool, not a medical device and not a
        substitute for professional medical advice. Rankings, progress estimates, and training
        suggestions shown in the app are calculated from the data you enter and are provided for
        motivational purposes only. Talk to a doctor before starting any new exercise program,
        especially if you have an existing health condition.
      </LegalSection>

      <LegalSection title="6. Subscriptions">
        Certain features (competing in the rank system, gym leaderboards, Crew training, and progress
        photo comparison) may require a paid subscription. Pricing, billing terms, and cancellation
        will be shown at the point of purchase once subscriptions are available. Free features remain
        free.
      </LegalSection>

      <LegalSection title="7. Your content">
        You keep ownership of anything you upload (profile photos, progress photos, workout data).
        By uploading it, you give us a license to store and display it back to you and, where
        applicable, to the other members of your Crew — solely to operate the Service. You can delete
        your content, and your account entirely, at any time from Profile → Account.
      </LegalSection>

      <LegalSection title="8. Termination">
        You may stop using the Service and delete your account at any time. We may suspend or
        terminate an account that violates these Terms, abuses other users, or attempts to
        manipulate the Service (for example, submitting fabricated workout data to inflate rankings
        or Crew scores).
      </LegalSection>

      <LegalSection title="9. Disclaimer and liability">
        The Service is provided “as is”, without warranties of any kind. To the maximum extent
        permitted by law, [COMPANY NAME] is not liable for indirect, incidental, or consequential
        damages arising from your use of the Service.
      </LegalSection>

      <LegalSection title="10. Changes to these Terms">
        We may update these Terms from time to time. If we make material changes, we&apos;ll let you
        know in the app before they take effect. Continuing to use the Service after a change means
        you accept the updated Terms.
      </LegalSection>

      <LegalSection title="11. Contact">
        Questions about these Terms? Reach us at [CONTACT EMAIL].
      </LegalSection>
    </LegalScreenLayout>
  );
}
