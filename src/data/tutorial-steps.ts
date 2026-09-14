import type { images } from "@/constants/images";

export type TutorialStepContent = {
  /** Tab this step's spotlighted widget lives on — the tour navigates here before showing the
   * step. Welcome/outro reuse the neighboring step's route+widget (see AppTourOverlay.tsx's
   * `ATTACH_INDEXES`), so every step always has one. */
  route: "/home" | "/crew" | "/ranks" | "/profile";
  mascot: keyof typeof images;
  title: string;
  body: string;
};

export const TUTORIAL_CONTENT: TutorialStepContent[] = [
  {
    route: "/home",
    mascot: "mascotSplash",
    title: "Hey!",
    body: "20-second tour, then you're free.",
  },
  {
    route: "/home",
    mascot: "mascotFlexing",
    title: "Start here",
    body: "Log sets in seconds, mid-workout.",
  },
  {
    route: "/ranks",
    mascot: "mascotArmsCrossed",
    title: "Your rank",
    body: "Fair fights — same size, same gender.",
  },
  {
    route: "/crew",
    mascot: "mascotteCrew",
    title: "Crew score",
    body: "Grind together. Beat other crews.",
  },
  {
    route: "/profile",
    mascot: "mascotteCrossedArms",
    title: "Your stats",
    body: "Every rank, PR, and workout — logged.",
  },
  {
    route: "/profile",
    mascot: "mascotSplash",
    title: "That's it",
    body: "Now go lift something.",
  },
];
