import React from 'react';
import { Link } from '@tanstack/react-router';
import { Phone, MapPin, ArrowUpRight, Hash } from 'lucide-react';
import { Route as FarmerDetailsRoute } from '@/routes/store-admin/_authenticated/people/$farmerStorageLinkId/index';
import { Route as PeopleRoute } from '@/routes/store-admin/_authenticated/people/index';

type Farmer = {
  _id: string;
  farmerId: {
    _id: string;
    name: string;
    address: string;
    mobileNumber: string;
  };
  accountNumber: number;
  isActive: boolean;
};

type FarmerCardProps = {
  data: Farmer[];
};

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export const FarmerCard: React.FC<FarmerCardProps> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((farmer) => (
        <Link
          key={farmer._id}
          from={PeopleRoute.fullPath}
          to={FarmerDetailsRoute.to}
          params={{ farmerStorageLinkId: farmer._id }}
          state={(prev) => ({
            ...prev,
            farmerName: farmer.farmerId.name,
            farmerAddress: farmer.farmerId.address,
          })}
          preload="intent"
          preloadDelay={100}
          activeOptions={{ exact: true }}
          className="group focus-visible:ring-primary rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <div className="border-border/40 bg-card hover:border-border/70 relative overflow-hidden rounded-2xl border px-5 py-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
            {/* Top accent bar — appears on hover */}
            <div className="bg-primary absolute inset-x-0 top-0 h-[3px] rounded-t-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

            {/* Header: avatar + status badge */}
            <div className="mb-4 flex items-start justify-between">
              <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium">
                {getInitials(farmer.farmerId.name)}
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${
                  farmer.isActive
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {farmer.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Name */}
            <p className="text-foreground text-[15px] leading-snug font-medium">
              {farmer.farmerId.name}
            </p>

            {/* Account number */}
            <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
              <Hash className="h-3 w-3" />
              <span>{farmer.accountNumber}</span>
            </div>

            <hr className="border-border/40 my-4" />

            {/* Detail rows */}
            <div className="text-muted-foreground space-y-2.5 text-sm">
              <div className="flex items-start gap-2.5">
                <Phone className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                <span>{farmer.farmerId.mobileNumber}</span>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                <span>{farmer.farmerId.address}</span>
              </div>
            </div>

            {/* Arrow nudge */}
            <div className="bg-muted group-hover:bg-primary/10 absolute right-4 bottom-4 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <ArrowUpRight className="text-primary h-3 w-3" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};
