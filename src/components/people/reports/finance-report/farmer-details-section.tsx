import { memo } from 'react';
import {
  Building,
  Hash,
  MapPin,
  MapPinned,
  Phone,
  UserRound,
} from 'lucide-react';

import type {
  FarmerStorageLinkInPassesPayload,
  StationRates,
} from '@/services/store-admin/people/useGetAllGatePassesOfFarmer';

export interface FarmerDetailsSectionProps {
  farmerStorageLink: FarmerStorageLinkInPassesPayload;
  stationName?: string;
  localityName?: string;
  localityRates?: StationRates | null;
}

function DetailCard({
  icon: Icon,
  label,
  value,
  subValue,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="border-border/50 bg-card rounded-xl border p-3">
      <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </p>
      <p className="font-custom text-foreground text-sm font-semibold">
        {value}
      </p>
      {subValue ? (
        <p className="font-custom text-muted-foreground mt-0.5 text-xs tabular-nums">
          {subValue}
        </p>
      ) : null}
    </div>
  );
}

function FarmerDetailsSection({
  farmerStorageLink,
  stationName,
  localityName,
  localityRates,
}: FarmerDetailsSectionProps) {
  const trimmedStation = stationName?.trim();
  const trimmedLocality = localityName?.trim();
  const freightRatesLabel = localityRates
    ? `Freight: ₹${localityRates.seedDispatchRatePerBag.toLocaleString('en-IN')}/bag seed · ₹${localityRates.seedBuyBackRatePerQuintal.toLocaleString('en-IN')}/qtl buy-back`
    : undefined;

  return (
    <section className="border-border/40 space-y-3 rounded-xl border p-3 sm:p-4">
      <h2 className="font-custom text-foreground text-lg font-semibold sm:text-xl">
        Farmer details
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <DetailCard
          icon={UserRound}
          label="Name"
          value={farmerStorageLink.name}
        />
        <DetailCard
          icon={Hash}
          label="Account"
          value={`#${farmerStorageLink.accountNumber}`}
        />
        <DetailCard
          icon={Phone}
          label="Mobile"
          value={farmerStorageLink.mobileNumber}
        />
        <DetailCard
          icon={MapPin}
          label="Address"
          value={farmerStorageLink.address}
        />
        {trimmedStation ? (
          <DetailCard icon={Building} label="Station" value={trimmedStation} />
        ) : null}
        {trimmedLocality ? (
          <DetailCard
            icon={MapPinned}
            label="Locality"
            value={trimmedLocality}
            subValue={freightRatesLabel}
          />
        ) : null}
      </div>
    </section>
  );
}

export default memo(FarmerDetailsSection);
