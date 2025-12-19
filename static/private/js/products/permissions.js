// static/private/js/products/permissions.js

export async function initProductPermissions() {
  await PermissionsHelper.init();

  return {
    canView:   PermissionsHelper.hasPermission('products', 'view'),
    canCreate: PermissionsHelper.hasPermission('products', 'create'),
    canEdit:   PermissionsHelper.hasPermission('products', 'edit'),
    canDelete: PermissionsHelper.hasPermission('products', 'delete'),
    canExport: PermissionsHelper.hasPermission('products', 'export'),
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