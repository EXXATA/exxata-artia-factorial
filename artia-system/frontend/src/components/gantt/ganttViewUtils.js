export function buildComparisonByDay(comparisonData) {
  return Object.fromEntries((comparisonData?.dailyDetails || []).map((detail) => [detail.date, detail]));
}

export function getWeeklyFactorialHours(comparisonData) {
  return (comparisonData?.comparisons || []).reduce((sum, detail) => sum + (detail.factorialHours || 0), 0);
}
