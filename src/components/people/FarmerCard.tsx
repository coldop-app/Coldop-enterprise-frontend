import React from 'react';
import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
          className="focus-visible:ring-primary rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <Card className="rounded-2xl shadow-sm transition hover:shadow-md">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <CardTitle className="text-base font-semibold">
                {farmer.farmerId.name}
              </CardTitle>

              <Badge variant={farmer.isActive ? 'default' : 'secondary'}>
                {farmer.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </CardHeader>

            <CardContent className="text-muted-foreground space-y-2 text-sm">
              <div>
                <span className="text-foreground font-medium">Account No:</span>{' '}
                {farmer.accountNumber}
              </div>

              <div>
                <span className="text-foreground font-medium">Mobile:</span>{' '}
                {farmer.farmerId.mobileNumber}
              </div>

              <div>
                <span className="text-foreground font-medium">Address:</span>{' '}
                {farmer.farmerId.address}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};
