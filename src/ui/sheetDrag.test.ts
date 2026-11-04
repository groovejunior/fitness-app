import { describe, expect, it } from 'vitest';
import { DISMISS_DISTANCE_PX, sheetDragY, shouldDismissSheet, TAP_SLOP_PX } from './sheetDrag';

describe('sheetDragY', () => {
  it('follows a downward drag and ignores an upward one', () => {
    expect(sheetDragY(100, 160)).toBe(60);
    expect(sheetDragY(100, 40)).toBe(0);
    expect(sheetDragY(100, 100)).toBe(0);
  });
});

describe('shouldDismissSheet', () => {
  it('treats a tap on the bar as not a drag-dismiss (the tap handler closes instead)', () => {
    expect(shouldDismissSheet(0, 0)).toBe(false);
    expect(shouldDismissSheet(TAP_SLOP_PX - 1, 2)).toBe(false);
  });

  it('closes after a slow drag past the distance threshold', () => {
    expect(shouldDismissSheet(DISMISS_DISTANCE_PX, 0)).toBe(true);
    expect(shouldDismissSheet(DISMISS_DISTANCE_PX - 1, 0)).toBe(false);
  });

  it('closes on a downward flick once the sheet has moved a little', () => {
    expect(shouldDismissSheet(40, 0.8)).toBe(true);
    expect(shouldDismissSheet(40, 0.2)).toBe(false);
    expect(shouldDismissSheet(20, 1)).toBe(false);
  });
});
