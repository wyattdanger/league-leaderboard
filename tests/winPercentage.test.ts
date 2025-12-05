import { describe, it, expect } from '@jest/globals';
import { calculateMatchWinPercentage, calculateGameWinPercentage } from '../src/utils/winPercentage';

describe('calculateMatchWinPercentage', () => {
  it('should calculate MWP correctly with no draws', () => {
    // 5-1-0 should be 5/6 = 0.8333...
    const mwp = calculateMatchWinPercentage(5, 1, 0);
    expect(mwp).toBeCloseTo(0.8333, 4);
  });

  it('should calculate MWP correctly with draws (draws count as 0.5 wins)', () => {
    // 5-0-1 should be (5 + 0.5) / 6 = 5.5/6 = 0.9166...
    const mwp = calculateMatchWinPercentage(5, 0, 1);
    expect(mwp).toBeCloseTo(0.9167, 4);
  });

  it('should treat 5-0-1 better than 5-1-0', () => {
    const mwpWithDraw = calculateMatchWinPercentage(5, 0, 1); // 5.5/6
    const mwpWithLoss = calculateMatchWinPercentage(5, 1, 0); // 5/6
    expect(mwpWithDraw).toBeGreaterThan(mwpWithLoss);
  });

  it('should handle all draws', () => {
    // 0-0-3 should be (0 + 1.5) / 3 = 0.5
    const mwp = calculateMatchWinPercentage(0, 0, 3);
    expect(mwp).toBe(0.5);
  });

  it('should handle zero matches', () => {
    const mwp = calculateMatchWinPercentage(0, 0, 0);
    expect(mwp).toBe(0);
  });

  it('should calculate 3-0-0 as 100%', () => {
    const mwp = calculateMatchWinPercentage(3, 0, 0);
    expect(mwp).toBe(1.0);
  });

  it('should calculate 2-0-1 correctly', () => {
    // 2-0-1 should be (2 + 0.5) / 3 = 2.5/3 = 0.8333...
    const mwp = calculateMatchWinPercentage(2, 0, 1);
    expect(mwp).toBeCloseTo(0.8333, 4);
  });
});

describe('calculateGameWinPercentage', () => {
  it('should calculate GWP correctly with no draws', () => {
    // 10-2-0 should be 10/12 = 0.8333...
    const gwp = calculateGameWinPercentage(10, 2, 0);
    expect(gwp).toBeCloseTo(0.8333, 4);
  });

  it('should calculate GWP correctly with draws (draws count as 0.5 wins)', () => {
    // 10-0-2 should be (10 + 1) / 12 = 11/12 = 0.9166...
    const gwp = calculateGameWinPercentage(10, 0, 2);
    expect(gwp).toBeCloseTo(0.9167, 4);
  });

  it('should treat 10-0-2 better than 10-2-0', () => {
    const gwpWithDraws = calculateGameWinPercentage(10, 0, 2); // 11/12
    const gwpWithLosses = calculateGameWinPercentage(10, 2, 0); // 10/12
    expect(gwpWithDraws).toBeGreaterThan(gwpWithLosses);
  });

  it('should handle zero games', () => {
    const gwp = calculateGameWinPercentage(0, 0, 0);
    expect(gwp).toBe(0);
  });
});
