import { DivisionUpOverlay } from "@/components/DivisionUpOverlay";
import { useCrewStore } from "@/store/crew-store";
import { useProfileLevelStore } from "@/store/profile-level-store";

/** Mounted once at the app root so a division-up celebration can fire no matter which screen
 * triggered it (finishing a workout, a crew challenge completing, etc.). */
export function DivisionCelebrationWatcher() {
  const crewCelebration = useCrewStore((state) => state.pendingDivisionCelebration);
  const crewName = useCrewStore((state) => state.name);
  const clearCrewCelebration = useCrewStore((state) => state.clearDivisionCelebration);

  const profileCelebration = useProfileLevelStore((state) => state.pendingDivisionCelebration);
  const clearProfileCelebration = useProfileLevelStore((state) => state.clearDivisionCelebration);

  // If both happen to fire at once, the crew's takes priority — the personal one will show right
  // after, once this one is dismissed and re-render picks it up.
  if (crewCelebration) {
    return (
      <DivisionUpOverlay
        visible
        subjectLabel={crewName}
        from={crewCelebration.from}
        to={crewCelebration.to}
        onDismiss={clearCrewCelebration}
      />
    );
  }

  if (profileCelebration) {
    return (
      <DivisionUpOverlay
        visible
        subjectLabel="You"
        from={profileCelebration.from}
        to={profileCelebration.to}
        onDismiss={clearProfileCelebration}
      />
    );
  }

  return null;
}
