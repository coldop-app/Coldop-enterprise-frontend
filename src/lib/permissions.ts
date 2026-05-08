import type { ResourcePermission } from '@/types/store-admin';

export type PermissionMap = Record<string, Record<string, true>>;

export function buildPermissionMap(
  permissions: ResourcePermission[] | null | undefined
): PermissionMap {
  if (!permissions?.length) return {};

  return permissions.reduce<PermissionMap>((map, permission) => {
    const resourceKey = permission.resource;
    const actions = Array.isArray(permission.actions) ? permission.actions : [];

    map[resourceKey] = actions.reduce<Record<string, true>>(
      (actionMap, action) => {
        if (action) actionMap[action] = true;
        return actionMap;
      },
      {}
    );

    return map;
  }, {});
}

export function canDo(
  permissionMap: PermissionMap,
  resource: string,
  action: string
): boolean {
  return Boolean(permissionMap[resource]?.[action]);
}

export function hasAnyAction(
  permissionMap: PermissionMap,
  resource: string,
  actions: string[]
): boolean {
  if (!actions.length) return false;
  return actions.some((action) => canDo(permissionMap, resource, action));
}
