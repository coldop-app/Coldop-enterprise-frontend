import type { UseMutateAsyncFunction } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import type {
  CreateLocalityApiResponse,
  CreateLocalityInput,
  DeleteLocalityApiResponse,
  EditLocalityApiResponse,
  EditLocalityParams,
} from '@/types/locality';
import type {
  CreateStationApiResponse,
  CreateStationInput,
  EditStationApiResponse,
  EditStationParams,
} from '@/types/station';
import {
  parseRequiredNumberInput,
  type StationFormValues,
} from './station-form-utils';

type CreateStationMutate = UseMutateAsyncFunction<
  CreateStationApiResponse,
  AxiosError,
  CreateStationInput
>;

type EditStationMutate = UseMutateAsyncFunction<
  EditStationApiResponse,
  AxiosError,
  EditStationParams
>;

type CreateLocalityMutate = UseMutateAsyncFunction<
  CreateLocalityApiResponse,
  AxiosError,
  CreateLocalityInput
>;

type EditLocalityMutate = UseMutateAsyncFunction<
  EditLocalityApiResponse,
  AxiosError,
  EditLocalityParams
>;

type DeleteLocalityMutate = UseMutateAsyncFunction<
  DeleteLocalityApiResponse,
  AxiosError,
  { id: string; stationId?: string }
>;

function assertSuccess<T extends { success: boolean; message?: string }>(
  response: T,
  fallbackMessage: string
) {
  if (!response.success) {
    throw new Error(response.message ?? fallbackMessage);
  }
}

export async function handleCreateStationForm(
  value: StationFormValues,
  coldStorageId: string,
  createStation: CreateStationMutate,
  createLocality: CreateLocalityMutate
) {
  const stationRes = await createStation({
    coldStorageId,
    name: value.name.trim(),
  });

  assertSuccess(stationRes, 'Failed to create station');

  const stationId = stationRes.data?._id;
  if (!stationId) {
    throw new Error('Station was created but no ID was returned');
  }

  for (const row of value.localities) {
    const localityRes = await createLocality({
      stationId,
      name: row.name.trim(),
      seedDispatchRatePerBag: parseRequiredNumberInput(
        row.seedDispatchRatePerBag
      ),
      seedBuyBackRatePerQuintal: parseRequiredNumberInput(
        row.seedBuyBackRatePerQuintal
      ),
    });

    assertSuccess(localityRes, 'Failed to create locality');
  }
}

export async function handleEditStationForm(
  stationId: string,
  value: StationFormValues,
  removedIds: string[],
  editStation: EditStationMutate,
  createLocality: CreateLocalityMutate,
  editLocality: EditLocalityMutate,
  deleteLocality: DeleteLocalityMutate,
  coldStorageId: string
) {
  const stationRes = await editStation({
    id: stationId,
    coldStorageId,
    name: value.name.trim(),
  });

  assertSuccess(stationRes, 'Failed to update station');

  for (const id of removedIds) {
    const deleteRes = await deleteLocality({ id, stationId });
    assertSuccess(deleteRes, 'Failed to delete locality');
  }

  for (const row of value.localities) {
    const payload = {
      name: row.name.trim(),
      seedDispatchRatePerBag: parseRequiredNumberInput(
        row.seedDispatchRatePerBag
      ),
      seedBuyBackRatePerQuintal: parseRequiredNumberInput(
        row.seedBuyBackRatePerQuintal
      ),
    };

    if (row._id) {
      const editRes = await editLocality({ id: row._id, ...payload });
      assertSuccess(editRes, 'Failed to update locality');
      continue;
    }

    const createRes = await createLocality({ stationId, ...payload });
    assertSuccess(createRes, 'Failed to create locality');
  }
}
