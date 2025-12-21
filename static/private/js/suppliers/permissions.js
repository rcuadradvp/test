// static/private/js/suppliers/permissions.js

export async function initSuppliersPermissions() {
  await PermissionsHelper.init();

  return {
    canView:   PermissionsHelper.hasPermission('suppliers', 'view'),
    canCreate: PermissionsHelper.hasPermission('suppliers', 'create'),
    canEdit:   PermissionsHelper.hasPermission('suppliers', 'edit'),
    canDelete: PermissionsHelper.hasPermission('suppliers', 'delete'),
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