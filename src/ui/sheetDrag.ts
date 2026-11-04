/** How far (in pixels) a slow drag must travel before the sheet closes. */
export const DISMISS_DISTANCE_PX = 88;
/** Downward speed in px/ms that counts as a flick closed, once the sheet has moved a little. */
export const DISMISS_VELOCITY = 0.65;
/** Ignore jitter so a tap on the bar still counts as a tap. */
export const TAP_SLOP_PX = 10;

/** Downward offset while the finger is down. Never pulls the sheet above its rest position. */
export function sheetDragY(startClientY: number, clientY: number): number {
  return Math.max(0, clientY - startClientY);
}

/** Whether releasing here should close the sheet. */
export function shouldDismissSheet(dragY: number, velocityPxPerMs: number): boolean {
  if (dragY < TAP_SLOP_PX) return false;
  if (dragY >= DISMISS_DISTANCE_PX) return true;
  return velocityPxPerMs > DISMISS_VELOCITY && dragY > 28;
}
