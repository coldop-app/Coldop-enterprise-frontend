import { memo } from 'react';
import { Hash, MapPin, Phone, UserRound } from 'lucide-react';

import type { FarmerStorageLinkInPassesPayload } from '@/services/store-admin/people/useGetAllGatePassesOfFarmer';

export interface FarmerDetailsSectionProps {
  farmerStorageLink: FarmerStorageLinkInPassesPayload;
}

function FarmerDetailsSection({
  farmerStorageLink,
}: FarmerDetailsSectionProps) {
  return (
    <section className="border-border/40 space-y-3 rounded-xl border p-3 sm:p-4">
      <h2 className="font-custom text-foreground text-lg font-semibold sm:text-xl">
        Farmer details
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border-border/50 bg-card rounded-xl border p-3">
          <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
            <UserRound className="h-3.5 w-3.5" />
            Name
          </p>
          <p className="font-custom text-foreground text-sm font-semibold">
            {farmerStorageLink.name}
          </p>
        </div>
        <div className="border-border/50 bg-card rounded-xl border p-3">
          <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
            <Hash className="h-3.5 w-3.5" />
            Account
          </p>
          <p className="font-custom text-foreground text-sm font-semibold">
            #{farmerStorageLink.accountNumber}
          </p>
        </div>
        <div className="border-border/50 bg-card rounded-xl border p-3">
          <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
            <Phone className="h-3.5 w-3.5" />
            Mobile
          </p>
          <p className="font-custom text-foreground text-sm font-semibold">
            {farmerStorageLink.mobileNumber}
          </p>
        </div>
        <div className="border-border/50 bg-card rounded-xl border p-3">
          <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
            <MapPin className="h-3.5 w-3.5" />
            Address
          </p>
          <p className="font-custom text-foreground text-sm font-semibold">
            {farmerStorageLink.address}
          </p>
        </div>
      </div>
    </section>
  );
}

export default memo(FarmerDetailsSection);
