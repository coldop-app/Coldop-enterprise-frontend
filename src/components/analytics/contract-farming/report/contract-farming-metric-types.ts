/** Discriminated union for contract-farming report calculation dialogs. */
export type ContractFarmingMetricCalculation =
  | { type: 'averageQuintalPerAcre' }
  | { type: 'gradeWeightPercent'; grade: string }
  | { type: 'wastage' }
  | { type: 'outputPercentage' }
  | { type: 'buyBackAmount' }
  | { type: 'seedAmount' }
  | { type: 'netAmountPerAcre' };
