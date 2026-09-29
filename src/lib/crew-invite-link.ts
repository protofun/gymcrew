/** `app/invite/[code].tsx` is where this lands — a real, tappable deep link instead of a bare code
 * someone has to retype by hand into build-crew/join.tsx. Uses the app's own registered `scheme`
 * (see app.config.js), not a hosted web URL — there's no associated/universal-link domain set up
 * yet, so this only opens the app when it's already installed (the realistic near-term case: an
 * invite mostly goes to someone already in the same friend group's phone). */
export function crewInviteLink(inviteCode: string): string {
  return `gymcrew://invite/${inviteCode}`;
}
