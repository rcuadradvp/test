// static/private/js/clients/permissions.js

export async function initClientsPermissions() {
  await PermissionsHelper.init();

  return {
    canView:   PermissionsHelper.hasPermission('clients', 'view'),
    canCreate: PermissionsHelper.hasPermission('clients', 'create'),
    canEdit:   PermissionsHelper.hasPermission('clients', 'edit'),
    canDelete: PermissionsHelper.hasPermission('clients', 'delete'),
  };
}

export function assertCanView(perms) {
  if (!perms.canView) {
    const err = new Error('PERMISSION_DENIED');
    err.code = 'PERMISSION_DENIED';
    throw err;
  }
}

export function assertCanCreate(perms) {
  if (!perms.canCreate) {
    const err = new Error('PERMISSION_DENIED');
    err.code = 'PERMISSION_DENIED';
    throw err;
  }
}

export function assertCanEdit(perms) {
  if (!perms.canEdit) {
    const err = new Error('PERMISSION_DENIED');
    err.code = 'PERMISSION_DENIED';
    throw err;
  }
}

export function assertCanDelete(perms) {
  if (!perms.canDelete) {
    const err = new Error('PERMISSION_DENIED');
    err.code = 'PERMISSION_DENIED';
    throw err;
  }
}