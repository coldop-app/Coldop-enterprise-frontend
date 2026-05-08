/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
  ShieldCheck,
  Save,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Shield,
  ChevronDown,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  useGetRolePermissions,
  type RolePermissionData,
} from '@/services/store-admin/role-permissions/useGetRolePermissions';
import {
  useEditRolePermissions,
  type EditResourcePermissionInput,
} from '@/services/store-admin/role-permissions/useEditRolePermissions';

export const Route = createFileRoute(
  '/store-admin/_authenticated/settings/rbac/'
)({
  component: RouteComponent,
});

type RolePermissionDraft = {
  id: string;
  role: string;
  isActive: boolean;
  permissions: EditResourcePermissionInput[];
};

const KNOWN_ACTION_ORDER = ['create', 'read', 'update', 'reports', 'manage'];

const ACTION_DESCRIPTIONS: Record<string, string> = {
  create: 'Can create new records',
  read: 'Can view existing records',
  update: 'Can modify existing records',
  reports: 'Can access reports',
  manage: 'Full administrative control',
};

function normalizeRolePermissionForDraft(
  rolePermission: RolePermissionData
): RolePermissionDraft {
  return {
    id: rolePermission._id,
    role: rolePermission.role,
    isActive: rolePermission.isActive,
    permissions: rolePermission.permissions.map((permission) => ({
      resource: permission.resource,
      actions: [...permission.actions].sort((a, b) => a.localeCompare(b)),
    })),
  };
}

function getDraftSignature(draft: RolePermissionDraft): string {
  const normalizedPermissions = [...draft.permissions]
    .sort((a, b) => a.resource.localeCompare(b.resource))
    .map((permission) => ({
      resource: permission.resource,
      actions: [...permission.actions].sort((a, b) => a.localeCompare(b)),
    }));

  return JSON.stringify({
    role: draft.role,
    isActive: draft.isActive,
    permissions: normalizedPermissions,
  });
}

function getPermissionSummary(permissions: EditResourcePermissionInput[]) {
  const total = permissions.reduce((sum, p) => sum + p.actions.length, 0);
  const maxPossible = permissions.reduce((sum, p) => {
    const allActions = new Set<string>();
    p.actions.forEach((a) => allActions.add(a));
    return sum + allActions.size;
  }, 0);
  return { granted: total, total: maxPossible };
}

function RolePermissionCard({
  original,
  draft,
  onToggleIsActive,
  onToggleAction,
  onReset,
  onSave,
  isSaving,
}: {
  original: RolePermissionData;
  draft: RolePermissionDraft;
  onToggleIsActive: (id: string, checked: boolean) => void;
  onToggleAction: (id: string, resource: string, action: string) => void;
  onReset: (id: string) => void;
  onSave: (draft: RolePermissionDraft) => Promise<void>;
  isSaving: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);

  const originalSignature = useMemo(
    () => getDraftSignature(normalizeRolePermissionForDraft(original)),
    [original]
  );
  const draftSignature = useMemo(() => getDraftSignature(draft), [draft]);
  const isDirty = originalSignature !== draftSignature;

  const actionColumns = useMemo(() => {
    const actionSet = new Set<string>();
    for (const permission of draft.permissions) {
      for (const action of permission.actions) actionSet.add(action);
    }
    const known = KNOWN_ACTION_ORDER.filter((action) => actionSet.has(action));
    const unknown = [...actionSet]
      .filter((action) => !KNOWN_ACTION_ORDER.includes(action))
      .sort((a, b) => a.localeCompare(b));
    return [...known, ...unknown];
  }, [draft.permissions]);

  const summary = useMemo(
    () => getPermissionSummary(draft.permissions),
    [draft.permissions]
  );

  const getVisibleActionsForResource = (
    permission: EditResourcePermissionInput
  ) => {
    const isReadOnlyResource =
      permission.actions.length === 1 && permission.actions[0] === 'read';
    if (isReadOnlyResource) return ['read'];

    if (permission.resource === 'preferences') {
      return actionColumns.filter((action) => action !== 'reports');
    }

    return actionColumns;
  };

  return (
    <TooltipProvider>
      <Card
        className={cn(
          'rounded-2xl border transition-all duration-200',
          isDirty && 'border-amber-400/60 shadow-md shadow-amber-100/40',
          !draft.isActive && 'opacity-70'
        )}
      >
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="pb-3">
            {/* Top row: role name + status + collapse */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl',
                    draft.isActive
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Shield className="h-4 w-4" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <CardTitle className="font-custom text-base leading-tight font-semibold">
                    {draft.role}
                  </CardTitle>
                  <CardDescription className="font-custom text-xs">
                    {summary.granted} permissions across{' '}
                    {draft.permissions.length} resources
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isDirty && (
                  <Badge
                    variant="outline"
                    className="border-amber-400 bg-amber-50 text-xs text-amber-600"
                  >
                    Unsaved changes
                  </Badge>
                )}
                <Badge
                  variant={draft.isActive ? 'default' : 'secondary'}
                  className={cn(
                    'flex items-center gap-1 text-xs',
                    draft.isActive
                      ? 'border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                      : ''
                  )}
                >
                  {draft.isActive ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {draft.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>

            <Separator className="mt-3" />

            {/* Bottom row: active toggle + actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <Switch
                  id={`active-${draft.id}`}
                  checked={draft.isActive}
                  onCheckedChange={(checked) =>
                    onToggleIsActive(draft.id, checked)
                  }
                />
                <label
                  htmlFor={`active-${draft.id}`}
                  className="font-custom cursor-pointer text-sm font-medium select-none"
                >
                  Role active
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="text-muted-foreground h-3.5 w-3.5 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-52 text-xs">
                    Inactive roles are disabled system-wide regardless of
                    assigned permissions.
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onReset(draft.id)}
                  disabled={!isDirty || isSaving}
                  className="text-muted-foreground hover:text-foreground h-8 text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void onSave(draft)}
                  disabled={!isDirty || isSaving}
                  className="h-8 text-xs"
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSaving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="overflow-hidden rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="font-custom text-muted-foreground w-[200px] text-xs font-semibold tracking-wider uppercase">
                        Resource
                      </TableHead>
                      {actionColumns.map((action) => (
                        <TableHead
                          key={action}
                          className="font-custom text-muted-foreground text-center text-xs font-semibold tracking-wider uppercase"
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="border-muted-foreground/40 cursor-help border-b border-dashed">
                                {action}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              {ACTION_DESCRIPTIONS[action] ??
                                `Allow ${action} access`}
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {draft.permissions.map((permission, idx) => (
                      <TableRow
                        key={`${draft.id}-${permission.resource}`}
                        className={cn(
                          'transition-colors',
                          idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                        )}
                      >
                        <TableCell className="font-custom py-3 text-sm font-medium">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="bg-primary/40 h-1.5 w-1.5 shrink-0 rounded-full" />
                            {permission.resource}
                          </span>
                        </TableCell>

                        {actionColumns.map((action) => {
                          const visibleActions =
                            getVisibleActionsForResource(permission);
                          const shouldRenderCheckbox =
                            visibleActions.includes(action);
                          const checked =
                            shouldRenderCheckbox &&
                            permission.actions.includes(action);
                          return (
                            <TableCell
                              key={action}
                              className="py-3 text-center"
                            >
                              <div className="flex justify-center">
                                {shouldRenderCheckbox ? (
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() =>
                                      onToggleAction(
                                        draft.id,
                                        permission.resource,
                                        action
                                      )
                                    }
                                    aria-label={`${draft.role} ${permission.resource} ${action}`}
                                    className={cn(
                                      'transition-all',
                                      checked &&
                                        'data-[state=checked]:bg-primary data-[state=checked]:border-primary'
                                    )}
                                  />
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    --
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Footer hint */}
              {isDirty && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-600">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  You have unsaved changes. Click <strong>
                    Save changes
                  </strong>{' '}
                  to apply.
                </p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </TooltipProvider>
  );
}

function RouteComponent() {
  const { data, isLoading, isError, error } = useGetRolePermissions();
  const editRolePermission = useEditRolePermissions();
  const [overrides, setOverrides] = useState<
    Record<string, RolePermissionDraft>
  >({});

  const roles = useMemo(() => data ?? [], [data]);
  const adminRoles = useMemo(
    () => roles.filter((rolePermission) => rolePermission.role === 'Admin'),
    [roles]
  );
  const visibleRoles = adminRoles.length > 0 ? adminRoles : roles.slice(0, 1);
  const baseDrafts = useMemo(
    () =>
      roles.reduce<Record<string, RolePermissionDraft>>(
        (acc, rolePermission) => {
          acc[rolePermission._id] =
            normalizeRolePermissionForDraft(rolePermission);
          return acc;
        },
        {}
      ),
    [roles]
  );

  const getCurrentDraft = (id: string) => overrides[id] ?? baseDrafts[id];

  const handleToggleIsActive = (id: string, checked: boolean) => {
    const currentDraft = getCurrentDraft(id);
    if (!currentDraft) return;
    setOverrides((prev) => ({
      ...prev,
      [id]: { ...currentDraft, isActive: checked },
    }));
  };

  const handleToggleAction = (id: string, resource: string, action: string) => {
    const currentDraft = getCurrentDraft(id);
    if (!currentDraft) return;
    setOverrides((prev) => ({
      ...prev,
      [id]: {
        ...currentDraft,
        permissions: currentDraft.permissions.map((permission) => {
          if (permission.resource !== resource) return permission;
          const hasAction = permission.actions.includes(action);
          const nextActions = hasAction
            ? permission.actions.filter((item) => item !== action)
            : [...permission.actions, action];
          return {
            ...permission,
            actions: [...nextActions].sort((a, b) => a.localeCompare(b)),
          };
        }),
      },
    }));
  };

  const handleResetRole = (id: string) => {
    setOverrides((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleSaveRole = async (draft: RolePermissionDraft) => {
    await editRolePermission.mutateAsync({
      id: draft.id,
      role: draft.role,
      isActive: draft.isActive,
      permissions: draft.permissions,
    });
    setOverrides((prev) => {
      if (!prev[draft.id]) return prev;
      const next = { ...prev };
      delete next[draft.id];
      return next;
    });
  };

  const dirtyCount = visibleRoles.filter(
    (rolePermission) => overrides[rolePermission._id]
  ).length;

  if (isLoading) {
    return (
      <main className="mx-auto flex max-w-5xl flex-col gap-5 p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto max-w-5xl p-3 sm:p-4 lg:p-6">
        <Alert variant="destructive" className="rounded-xl">
          <XCircle className="h-4 w-4" />
          <AlertTitle className="font-custom font-semibold">
            Unable to load role permissions
          </AlertTitle>
          <AlertDescription className="font-custom">
            {error instanceof Error
              ? error.message
              : 'Please refresh the page and try again.'}
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  if (roles.length === 0) {
    return (
      <main className="mx-auto max-w-5xl p-3 sm:p-4 lg:p-6">
        <Empty className="py-20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldCheck />
            </EmptyMedia>
            <EmptyTitle className="font-custom">
              No role permissions found
            </EmptyTitle>
            <EmptyDescription className="font-custom">
              Once roles are created in the backend, they will appear here for
              editing.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-5 p-3 sm:p-4 lg:p-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
              <ShieldCheck className="text-primary h-4 w-4" />
            </div>
            <h1 className="font-custom text-xl font-bold tracking-tight">
              Role Based Access Control
            </h1>
          </div>
          <p className="font-custom text-muted-foreground ml-10.5 text-sm">
            Manage resource-level permissions for each role in your system.
          </p>
        </div>

        {dirtyCount > 0 && (
          <Badge
            variant="outline"
            className="h-7 border-amber-400 bg-amber-50 px-2.5 text-xs text-amber-700"
          >
            {dirtyCount} role{dirtyCount > 1 ? 's' : ''} with unsaved changes
          </Badge>
        )}
      </div>

      <Separator />

      <Tabs defaultValue={visibleRoles[0]?._id} className="flex flex-col gap-4">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-1">
          {visibleRoles.map((rolePermission) => (
            <TabsTrigger
              key={rolePermission._id}
              value={rolePermission._id}
              className="font-custom min-w-24 rounded-md px-4 text-sm"
            >
              {rolePermission.role}
            </TabsTrigger>
          ))}
        </TabsList>

        {visibleRoles.map((rolePermission) => {
          const draft = getCurrentDraft(rolePermission._id);
          if (!draft) return null;

          return (
            <TabsContent key={rolePermission._id} value={rolePermission._id}>
              <RolePermissionCard
                original={rolePermission}
                draft={draft}
                onToggleIsActive={handleToggleIsActive}
                onToggleAction={handleToggleAction}
                onReset={handleResetRole}
                onSave={handleSaveRole}
                isSaving={editRolePermission.isPending}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </main>
  );
}
