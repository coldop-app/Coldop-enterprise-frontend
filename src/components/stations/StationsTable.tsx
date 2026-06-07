import { Fragment } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { StationWithLocalities } from '@/types/station';
import { formatNumberValue, formatStationDate } from './station-form-utils';

interface StationsTableProps {
  stations: StationWithLocalities[];
  canManage: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (station: StationWithLocalities) => void;
  onDelete: (station: StationWithLocalities) => void;
}

export function StationsTable({
  stations,
  canManage,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: StationsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-custom">Station</TableHead>
            <TableHead className="font-custom">Localities</TableHead>
            <TableHead className="font-custom hidden sm:table-cell">
              Updated
            </TableHead>
            {canManage && (
              <TableHead className="font-custom w-[180px] text-right">
                Actions
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {stations.map((station) => (
            <Fragment key={station._id}>
              <TableRow className="hover:bg-muted/30 transition-colors duration-200">
                <TableCell className="font-custom font-medium">
                  {station.name}
                </TableCell>
                <TableCell className="font-custom text-muted-foreground">
                  {station.localities.length}{' '}
                  {station.localities.length === 1 ? 'locality' : 'localities'}
                </TableCell>
                <TableCell className="font-custom text-muted-foreground hidden sm:table-cell">
                  {formatStationDate(station.updatedAt)}
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="font-custom gap-2 transition-colors duration-200"
                          onClick={() => onEdit(station)}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="font-custom text-destructive hover:bg-destructive/10 hover:text-destructive gap-2 transition-colors duration-200"
                          onClick={() => onDelete(station)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>

              {station.localities.map((locality) => (
                <TableRow
                  key={locality._id}
                  className="bg-muted/20 hover:bg-muted/30 transition-colors duration-200"
                >
                  <TableCell className="font-custom pl-8 text-sm">
                    <span className="text-muted-foreground mr-2">↳</span>
                    {locality.name}
                  </TableCell>
                  <TableCell className="font-custom text-muted-foreground text-sm">
                    dispatch{' '}
                    {formatNumberValue(locality.seedDispatchRatePerBag)} ·
                    buy-back{' '}
                    {formatNumberValue(locality.seedBuyBackRatePerQuintal)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell" />
                  {canManage && <TableCell />}
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
