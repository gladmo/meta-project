// Conversion from reference-machine expectations to performance budgets.
// Ported from the source project's benchmarks/support/calibration.ts.

/** Measured wall-time ratio between the CI runner and the arm64 reference machine. */
export const CI_TIME_SCALE = 2
/** Allowed variance above a calibrated expectation. */
export const PERFORMANCE_BUDGET_HEADROOM = 1.25

/**
 * Convert a reference-machine duration into its CI wall-time budget.
 * @param {number} expectedMs Expected duration on the reference machine.
 * @returns {number} Integer CI budget including machine scaling and variance headroom.
 */
export function ciTimeBudget(expectedMs) {
  return Math.ceil(expectedMs * CI_TIME_SCALE * PERFORMANCE_BUDGET_HEADROOM)
}

/**
 * Convert a reference-machine memory expectation into its budget. The time
 * scale never applies to memory or to dimensionless ratios.
 * @param {number} expectedMiB Expected retained heap on the reference machine.
 * @returns {number} Ceiling in MiB including variance headroom only.
 */
export function memoryBudgetMiB(expectedMiB) {
  return Math.ceil(expectedMiB * PERFORMANCE_BUDGET_HEADROOM)
}
