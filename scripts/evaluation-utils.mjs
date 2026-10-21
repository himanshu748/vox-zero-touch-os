export function nearestRank(values, percentile) {
  if (!values.length || values.some((n) => !Number.isFinite(n) || n < 0))
    throw new Error("Measurements must be finite, nonnegative and nonempty.");
  if (!Number.isFinite(percentile) || percentile <= 0 || percentile > 1)
    throw new Error("Invalid percentile.");
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(percentile * sorted.length) - 1];
}

export const round = (value) => Number(value.toFixed(2));

export function distribution(values) {
  return {
    samples: values.length,
    minimumMs: Math.min(...values),
    p50Ms: nearestRank(values, 0.5),
    p95Ms: nearestRank(values, 0.95),
    maximumMs: Math.max(...values),
  };
}
