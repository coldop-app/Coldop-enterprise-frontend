import type {
  GradingGatePassReportData,
  GradingGatePassReportDataFlat,
  GradingGatePassReportDataGrouped,
  GradingGatePassReportDataGroupedByVariety,
  GradingGatePassReportDataGroupedByVarietyAndFarmer,
  IncomingGatePassReportDataFlat,
  IncomingGatePassReportDataFlatWithStatus,
  IncomingGatePassReportDataGrouped,
  IncomingGatePassReportDataGroupedByVariety,
  IncomingGatePassReportDataGroupedByVarietyAndFarmer,
  IncomingGatePassReportDataGroupedByVarietyAndFarmerWithStatus,
  IncomingGatePassReportDataGroupedByVarietyWithStatus,
  IncomingGatePassReportDataGroupedWithStatus,
  IncomingGatePassReportDataWithStatus,
} from '@/types/analytics';

function isGradingGrouped(
  data: GradingGatePassReportDataGrouped | GradingGatePassReportDataFlat
): data is GradingGatePassReportDataGrouped {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'gatePasses' in data[0] &&
    Array.isArray((data[0] as GradingGatePassReportDataGrouped[0]).gatePasses)
  );
}

function isGradingGroupedByVariety(
  data: GradingGatePassReportData
): data is GradingGatePassReportDataGroupedByVariety {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'variety' in data[0] &&
    'gatePasses' in data[0] &&
    !('farmers' in data[0])
  );
}

function isGradingGroupedByVarietyAndFarmer(
  data: GradingGatePassReportData
): data is GradingGatePassReportDataGroupedByVarietyAndFarmer {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'variety' in data[0] &&
    'farmers' in data[0]
  );
}

/** Collect set of incoming gate pass IDs that have a grading gate pass (i.e. are graded) */
function getGradedIncomingGatePassIds(
  gradingData: GradingGatePassReportData
): Set<string> {
  const ids = new Set<string>();
  const collectFromGatePasses = (
    gatePasses: GradingGatePassReportDataFlat
  ): void => {
    for (const gp of gatePasses) {
      const id =
        typeof gp.incomingGatePassId === 'object' &&
        gp.incomingGatePassId != null
          ? (gp.incomingGatePassId as { _id?: string })._id
          : null;
      if (id) ids.add(id);
    }
  };
  if (isGradingGroupedByVarietyAndFarmer(gradingData)) {
    for (const item of gradingData) {
      for (const f of item.farmers) {
        collectFromGatePasses(f.gatePasses);
      }
    }
  } else if (isGradingGroupedByVariety(gradingData)) {
    for (const item of gradingData) {
      collectFromGatePasses(item.gatePasses);
    }
  } else if (isGradingGrouped(gradingData)) {
    for (const group of gradingData) {
      collectFromGatePasses(group.gatePasses);
    }
  } else {
    collectFromGatePasses(gradingData as GradingGatePassReportDataFlat);
  }
  return ids;
}

function isIncomingGrouped(
  data:
    | IncomingGatePassReportDataGrouped
    | IncomingGatePassReportDataFlat
    | IncomingGatePassReportDataGroupedByVariety
    | IncomingGatePassReportDataGroupedByVarietyAndFarmer
): data is IncomingGatePassReportDataGrouped {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'farmer' in data[0] &&
    'gatePasses' in data[0]
  );
}

function isIncomingGroupedByVariety(
  data:
    | IncomingGatePassReportDataGrouped
    | IncomingGatePassReportDataFlat
    | IncomingGatePassReportDataGroupedByVariety
    | IncomingGatePassReportDataGroupedByVarietyAndFarmer
): data is IncomingGatePassReportDataGroupedByVariety {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'variety' in data[0] &&
    'gatePasses' in data[0] &&
    !('farmers' in data[0])
  );
}

function isIncomingGroupedByVarietyAndFarmer(
  data:
    | IncomingGatePassReportDataGrouped
    | IncomingGatePassReportDataFlat
    | IncomingGatePassReportDataGroupedByVariety
    | IncomingGatePassReportDataGroupedByVarietyAndFarmer
): data is IncomingGatePassReportDataGroupedByVarietyAndFarmer {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'variety' in data[0] &&
    'farmers' in data[0]
  );
}

/**
 * Adds grading status to each incoming gate pass by comparing with grading report data.
 * Incoming gate passes whose _id appears as incomingGatePassId in any grading gate pass get status "Graded", others "Ungraded".
 */
export function addGradingStatusToIncomingReport(
  incomingData:
    | IncomingGatePassReportDataGrouped
    | IncomingGatePassReportDataFlat
    | IncomingGatePassReportDataGroupedByVariety
    | IncomingGatePassReportDataGroupedByVarietyAndFarmer,
  gradingData: GradingGatePassReportData
):
  | IncomingGatePassReportDataGroupedWithStatus
  | IncomingGatePassReportDataFlatWithStatus
  | IncomingGatePassReportDataGroupedByVarietyWithStatus
  | IncomingGatePassReportDataGroupedByVarietyAndFarmerWithStatus {
  const gradedIds = getGradedIncomingGatePassIds(gradingData);

  const withStatus = (
    pass: IncomingGatePassReportDataFlat[number]
  ): IncomingGatePassReportDataFlatWithStatus[number] => ({
    ...pass,
    gradingStatus: gradedIds.has(pass._id) ? 'Graded' : 'Ungraded',
  });

  if (isIncomingGroupedByVarietyAndFarmer(incomingData)) {
    return incomingData.map((item) => ({
      variety: item.variety,
      farmers: item.farmers.map((f) => ({
        farmer: f.farmer,
        gatePasses: f.gatePasses.map(withStatus),
      })),
    }));
  }
  if (isIncomingGroupedByVariety(incomingData)) {
    return incomingData.map((item) => ({
      variety: item.variety,
      gatePasses: item.gatePasses.map(withStatus),
    }));
  }
  if (isIncomingGrouped(incomingData)) {
    return incomingData.map((group) => ({
      farmer: group.farmer,
      gatePasses: group.gatePasses.map(withStatus),
    }));
  }
  return (incomingData as IncomingGatePassReportDataFlat).map(withStatus);
}

function isGroupedWithStatus(
  data: IncomingGatePassReportDataWithStatus
): data is IncomingGatePassReportDataGroupedWithStatus {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'farmer' in data[0] &&
    'gatePasses' in data[0]
  );
}

function isGroupedByVarietyWithStatus(
  data: IncomingGatePassReportDataWithStatus
): data is IncomingGatePassReportDataGroupedByVarietyWithStatus {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'variety' in data[0] &&
    'gatePasses' in data[0] &&
    !('farmers' in data[0])
  );
}

function isGroupedByVarietyAndFarmerWithStatus(
  data: IncomingGatePassReportDataWithStatus
): data is IncomingGatePassReportDataGroupedByVarietyAndFarmerWithStatus {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'variety' in data[0] &&
    'farmers' in data[0]
  );
}

/**
 * Filters incoming report data (with grading status) to only gate passes whose status is 'Ungraded'.
 * Preserves grouped vs flat shape.
 */
export function filterIncomingReportToUngraded(
  data: IncomingGatePassReportDataWithStatus
): IncomingGatePassReportDataWithStatus {
  if (isGroupedByVarietyAndFarmerWithStatus(data)) {
    return data
      .map((item) => ({
        variety: item.variety,
        farmers: item.farmers
          .map((f) => ({
            farmer: f.farmer,
            gatePasses: f.gatePasses.filter(
              (p) => p.gradingStatus === 'Ungraded'
            ),
          }))
          .filter((f) => f.gatePasses.length > 0),
      }))
      .filter((item) => item.farmers.length > 0);
  }
  if (isGroupedByVarietyWithStatus(data)) {
    return data
      .map((item) => ({
        variety: item.variety,
        gatePasses: item.gatePasses.filter(
          (p) => p.gradingStatus === 'Ungraded'
        ),
      }))
      .filter((item) => item.gatePasses.length > 0);
  }
  if (isGroupedWithStatus(data)) {
    const filtered = data
      .map((group) => ({
        farmer: group.farmer,
        gatePasses: group.gatePasses.filter(
          (p) => p.gradingStatus === 'Ungraded'
        ),
      }))
      .filter((group) => group.gatePasses.length > 0);
    return filtered;
  }
  return (data as IncomingGatePassReportDataFlatWithStatus).filter(
    (p) => p.gradingStatus === 'Ungraded'
  );
}
