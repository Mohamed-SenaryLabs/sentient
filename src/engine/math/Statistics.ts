/**
 * Statistical utility functions for the Physics Engine
 */

/**
 * Clamps a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Normalizes a value to a 0-100 gauge based on a target/baseline
 * @param value Current value
 * @param baseline Baseline/Target value
 * @param sensitivity How sensitive the gauge is to deviation (higher = more sensitive)
 */
export function normalizeToGauge(value: number, baseline: number, sensitivity: number = 1.0): number {
  if (baseline === 0) return 0;
  
  const ratio = value / baseline;
  
  // Sigmoid-like curve centered at baseline (1.0 -> 50%)
  // Adjusted so 100% of baseline -> 50 on gauge? Or 100% load -> 100% gauge?
  // V1 logic likely: 0 = 0, baseline = 50?, 2x baseline = 100?
  // Let's implement a simple linear-ish scaling clamped at 2x baseline
  
  // Re-interpreting V1 intent:
  // Usually for "Load", 0 is 0. Baseline (Average) is "Normal" (e.g. 50).
  
  const normalized = (value / (baseline * 2)) * 100;
  return clamp(normalized * sensitivity, 0, 100);
}

/**
 * Calculates Standard Score (Z-Score)
 */
export function calculateZScore(current: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (current - mean) / stdDev;
}

/**
 * Moving Average Calculation
 */
export function calculateMovingAverage(data: number[], window: number = 7): number {
  if (data.length === 0) return 0;
  const slice = data.slice(0, window);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / slice.length;
}

/**
 * Standard Deviation Calculation
 */
export function calculateStandardDeviation(data: number[]): number {
  if (data.length === 0) return 0;
  const mean = calculateMovingAverage(data, data.length);
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  return Math.sqrt(variance);
}
