# api/urls.py

from django.urls import path
from api.views import (
    auth_views, 
    role_views, 
    product_views, 
    user_views, 
    user_permissions_views,
    department_views,
    client_views,
    category_views,
    ticket_views,
    stock_management_views,
    reports_views,
    supplier_views,
    purchase_order_views,
    shift_views,
    sale_views,
    credit_views,
    promotion_views,
    consignment_views,
    configuration_views,
    alert_views,
    reports_complete_views,
    product_supplier_views,
)

urlpatterns = [
    # ========== AUTHENTICATION ==========
    path('auth/login/', auth_views.login_view, name='login'),
    path('auth/logout/', auth_views.logout_view, name='logout'),
    path('auth/me/', auth_views.current_user_view, name='current-user'),

    # ========== USERS ==========
    path('users/', user_views.list_users, name='list-users'),
    path('users/<uuid:user_id>/', user_views.get_user, name='get-user'),
    path('users/create/', user_views.create_user, name='create-user'),
    path('users/<uuid:user_id>/update/', user_views.update_user, name='update-user'),
    path('users/<uuid:user_id>/delete/', user_views.delete_user, name='delete-user'),

    # ========== ROLES & PERMISSIONS ==========
    path('roles/', role_views.list_roles, name='list-roles'),
    path('roles/<uuid:role_id>/', role_views.get_role_details, name='role-details'),
    
    # User-specific permissions
    path('users/<uuid:user_id>/permissions/', user_permissions_views.get_user_full_permissions, name='user-full-permissions'),
    path('users/<uuid:user_id>/permissions/page/', user_permissions_views.update_user_page_access, name='update-user-page'),
    path('users/<uuid:user_id>/permissions/permission/', user_permissions_views.update_user_permission, name='update-user-permission'),
    path('users/<uuid:user_id>/permissions/reset/', user_permissions_views.remove_all_user_restrictions, name='reset-user-permissions'),
   
    # ========== PRODUCTS ==========
    path('products/', product_views.list_products, name='list-products'),
    path('products/create/', product_views.create_product, name='create-product'),
    path('products/<uuid:product_id>/', product_views.get_product, name='get-product'),
    path('products/<uuid:product_id>/update/', product_views.update_product, name='update-product'),
    path('products/<uuid:product_id>/delete/', product_views.delete_product, name='delete-product'),
    path('products/barcode/<str:barcode>/', product_views.get_product_by_barcode, name='get-product-by-barcode'),
    path('products/export/', product_views.export_products, name='export-products'),
    path('products/import/', product_views.import_products, name='import-products'),
    path('products/reset-stock/', product_views.reset_stock, name='reset-stock'),
    path('products/bulk-update/', product_views.bulk_update_products, name='bulk-update-products'),
    path('products/no-asociados/', product_views.products_not_associated, name='products_not_associated'),
    
    # Defective products
    path('products/defective/', product_views.list_defective_products, name='list-defective-products'),
    path('products/defective/register/', product_views.register_defective_product, name='register-defective-product'),
    path('products/defective/<uuid:defective_id>/resolve/', product_views.resolve_defective_product, name='resolve-defective-product'),

    # ========== DEPARTMENTS ==========
    path('departments/', department_views.list_departments, name='list-departments'),
    path('departments/create/', department_views.create_department, name='create-department'),
    path('departments/<uuid:department_id>/', department_views.get_department, name='get-department'),
    path('departments/<uuid:department_id>/update/', department_views.update_department, name='update-department'),
    path('departments/<uuid:department_id>/delete/', department_views.delete_department, name='delete-department'),
    path('departments/export/', department_views.export_departments, name='export-departments'),

    # ========== CLIENTS ==========
    path('clients/', client_views.list_clients, name='list-clients'),
    path('clients/create/', client_views.create_client, name='create-client'),
    path('clients/<uuid:client_id>/', client_views.get_client, name='get-client'),
    path('clients/<uuid:client_id>/update/', client_views.update_client, name='update-client'),
    path('clients/<uuid:client_id>/delete/', client_views.delete_client, name='delete-client'),
    path('clients/rut/<str:rut>/', client_views.get_client_by_rut, name='get-client-by-rut'),
    path('clients/export/', client_views.export_clients, name='export-clients'),

    # ===== CATEGORIES =====
    path('categories/', category_views.list_categories, name='list_categories'),
    path('categories/<uuid:category_id>/', category_views.get_category, name='get_category'),
    path('categories/create/', category_views.create_category, name='create_category'),
    path('categories/<uuid:category_id>/update/', category_views.update_category, name='update_category'),
    path('categories/<uuid:category_id>/delete/', category_views.delete_category, name='delete_category'),

    # ===== NAVEGACIÓN JERÁRQUICA DE PRODUCTOS =====
    path('products/<str:department_slug>/', product_views.products_by_navigation, name='products_by_department'),
    path('products/<str:department_slug>/<str:category_slug>/', product_views.products_by_navigation, name='products_by_category'),
    

    # Gestión de tickets
    path('tickets/', ticket_views.list_tickets, name='list_tickets'),
    path('tickets/create/', ticket_views.create_ticket, name='create_ticket'),
    path('tickets/<uuid:ticket_id>/', ticket_views.get_ticket, name='get_ticket'),
    path('tickets/<uuid:ticket_id>/delete/', ticket_views.delete_ticket, name='delete_ticket'),
    path('tickets/print/', ticket_views.print_ticket, name='print_ticket'),
    path('tickets/reprint-last/', ticket_views.reprint_last_ticket, name='reprint_last_ticket'),
    path('tickets/pending/', ticket_views.get_pending_tickets, name='get_pending_tickets'),
    path('tickets/for-sale/<uuid:sale_id>/', ticket_views.create_ticket_for_sale, name='create_ticket_for_sale'),

    # Operaciones de stock
    path('stock/reset/', stock_management_views.reset_stock, name='reset_stock'),
    path('stock/bulk-update/', stock_management_views.bulk_update_stock, name='bulk_update_stock'),
    path('stock/suggested-purchases/', stock_management_views.suggested_purchases, name='suggested_purchases'),
    path('stock/summary/', stock_management_views.stock_summary, name='stock_summary'),
    
    # Auditoría
    path('stock/audit-history/', stock_management_views.stock_audit_history, name='stock_audit_history'),

    # Reportes completos
    path('reports/sales/', reports_views.sales_report, name='sales_report'),
    path('reports/cash-flow/', reports_views.cash_flow_report, name='cash_flow_report'),
    path('reports/inventory/', reports_views.inventory_report, name='inventory_report'),
    path('reports/credits/', reports_views.credits_report, name='credits_report'),
    path('reports/purchase-orders/', reports_views.purchase_orders_report, name='purchase_orders_report'),

    # ========== SUPPLIERS ==========
    path('suppliers/', supplier_views.list_suppliers, name='list-suppliers'),
    path('suppliers/create/', supplier_views.create_supplier, name='create-supplier'),
    path('suppliers/<uuid:supplier_id>/', supplier_views.get_supplier, name='get-supplier'),
    path('suppliers/<uuid:supplier_id>/update/', supplier_views.update_supplier, name='update-supplier'),
    path('suppliers/<uuid:supplier_id>/delete/', supplier_views.delete_supplier, name='delete-supplier'),
    path('suppliers/export/', supplier_views.export_suppliers, name='export-suppliers'),
    path('suppliers/suggested-purchases/', supplier_views.suggested_purchases, name='suggested-purchases'),

    # ========== PURCHASE ORDERS ==========
    path('purchase-orders/', purchase_order_views.list_purchase_orders, name='list-purchase-orders'),
    path('purchase-orders/create/', purchase_order_views.create_purchase_order, name='create-purchase-order'),
    path('purchase-orders/<uuid:order_id>/', purchase_order_views.get_purchase_order, name='get-purchase-order'),
    path('purchase-orders/<uuid:order_id>/update/', purchase_order_views.update_purchase_order, name='update-purchase-order'),
    path('purchase-orders/<uuid:order_id>/cancel/', purchase_order_views.cancel_purchase_order, name='cancel-purchase-order'),
    path('purchase-orders/export/', purchase_order_views.export_purchase_orders, name='export-purchase-orders'),

    # ========== SUPPLIER PAYMENTS ==========
    path('supplier-payments/', purchase_order_views.list_supplier_payments, name='list-supplier-payments'),
    path('supplier-payments/register/', purchase_order_views.register_supplier_payment, name='register-supplier-payment'),

    # ========== SHIFTS ==========
    path('shifts/', shift_views.list_shifts, name='list-shifts'),
    path('shifts/<uuid:shift_id>/', shift_views.get_shift, name='get-shift'),
    path('shifts/current/', shift_views.get_current_shift, name='get-current-shift'),
    path('shifts/open/', shift_views.open_shift, name='open-shift'),
    path('shifts/close/', shift_views.close_shift, name='close-shift'),
    path('shifts/lunch-break/start/', shift_views.start_lunch_break, name='start-lunch-break'),
    path('shifts/lunch-break/end/', shift_views.end_lunch_break, name='end-lunch-break'),
    path('shifts/force-close-previous/', shift_views.force_close_previous_shift, name='force-close-previous-shift'),
    path('shifts/<uuid:shift_id>/summary/', shift_views.get_shift_summary, name='get-shift-summary'),

    # ========== CASH MOVEMENTS ==========
    path('cash-movements/register/', shift_views.register_cash_movement, name='register-cash-movement'),
    path('cash-counts/register/', shift_views.register_cash_count, name='register-cash-count'),

    # ========== SALES (POS) ==========
    path('sales/', sale_views.list_sales, name='list-sales'),
    path('sales/create/', sale_views.create_sale, name='create-sale'),
    path('sales/<uuid:sale_id>/', sale_views.get_sale, name='get-sale'),
    path('sales/<uuid:sale_id>/cancel/', sale_views.cancel_sale, name='cancel-sale'),
    path('sales/daily-report/', sale_views.daily_sales_report, name='daily-sales-report'),
    path('sales/price-checker/', sale_views.price_checker, name='price-checker'),
    path('sales/print-last-ticket/', sale_views.print_last_ticket, name='print-last-ticket'),

    # ========== CREDITS ==========
    path('credits/', credit_views.list_credits, name='list-credits'),
    path('credits/<uuid:credit_id>/', credit_views.get_credit, name='get-credit'),
    path('credits/client/<uuid:client_id>/', credit_views.get_client_credits, name='get-client-credits'),
    path('credits/pay/', credit_views.pay_credit, name='pay-credit'),
    path('credits/payments/', credit_views.list_credit_payments, name='list-credit-payments'),
    path('credits/summary/', credit_views.credits_summary, name='credits-summary'),
    path('credits/export/', credit_views.export_credits, name='export-credits'),
    path('credits/overdue-report/', credit_views.overdue_credits_report, name='overdue-credits-report'),

    # ========== PROMOTIONS ==========
    path('promotions/', promotion_views.list_promotions, name='list-promotions'),
    path('promotions/create/', promotion_views.create_promotion, name='create-promotion'),
    path('promotions/<uuid:promotion_id>/', promotion_views.get_promotion, name='get-promotion'),
    path('promotions/<uuid:promotion_id>/update/', promotion_views.update_promotion, name='update-promotion'),
    path('promotions/<uuid:promotion_id>/delete/', promotion_views.delete_promotion, name='delete-promotion'),
    path('promotions/<uuid:promotion_id>/activate/', promotion_views.activate_promotion, name='activate-promotion'),
    path('promotions/<uuid:promotion_id>/deactivate/', promotion_views.deactivate_promotion, name='deactivate-promotion'),
    path('promotions/product/<uuid:product_id>/', promotion_views.get_active_promotions_for_product, name='promotions-for-product'),
    path('promotions/calculate-price/', promotion_views.calculate_promotion_price, name='calculate-promotion-price'),
    path('promotions/export/', promotion_views.export_promotions, name='export-promotions'),

    # ========== CONSIGNMENTS ==========
    path('consignments/', consignment_views.list_consignments, name='list-consignments'),
    path('consignments/create/', consignment_views.create_consignment, name='create-consignment'),
    path('consignments/<uuid:consignment_id>/', consignment_views.get_consignment, name='get-consignment'),
    path('consignments/<uuid:consignment_id>/activate/', consignment_views.activate_consignment, name='activate-consignment'),
    path('consignments/<uuid:consignment_id>/settle/', consignment_views.settle_consignment, name='settle-consignment'),
    path('consignments/<uuid:consignment_id>/cancel/', consignment_views.cancel_consignment, name='cancel-consignment'),
    path('consignments/summary/', consignment_views.consignment_summary, name='consignment-summary'),
    path('consignments/client/<uuid:client_id>/', consignment_views.get_client_consignments, name='client-consignments'),

    # ========== CONFIGURATION - PRINTER ==========
    path('config/printer/', configuration_views.list_printer_configs, name='list-printer-configs'),
    path('config/printer/active/', configuration_views.get_active_printer_config, name='active-printer-config'),
    path('config/printer/create/', configuration_views.create_printer_config, name='create-printer-config'),
    path('config/printer/<uuid:config_id>/update/', configuration_views.update_printer_config, name='update-printer-config'),
    path('config/printer/<uuid:config_id>/activate/', configuration_views.activate_printer_config, name='activate-printer-config'),
    path('config/printer/<uuid:config_id>/delete/', configuration_views.delete_printer_config, name='delete-printer-config'),
    path('config/printer/test/', configuration_views.test_printer_connection, name='test-printer'),

    # ========== CONFIGURATION - BARCODE READER ==========
    path('config/barcode/', configuration_views.list_barcode_configs, name='list-barcode-configs'),
    path('config/barcode/active/', configuration_views.get_active_barcode_config, name='active-barcode-config'),
    path('config/barcode/create/', configuration_views.create_barcode_config, name='create-barcode-config'),
    path('config/barcode/<uuid:config_id>/update/', configuration_views.update_barcode_config, name='update-barcode-config'),
    path('config/barcode/<uuid:config_id>/activate/', configuration_views.activate_barcode_config, name='activate-barcode-config'),
    path('config/barcode/<uuid:config_id>/delete/', configuration_views.delete_barcode_config, name='delete-barcode-config'),
    path('config/barcode/test/', configuration_views.test_barcode_reader_connection, name='test-barcode'),

    # ========== CONFIGURATION - ALL ==========
    path('config/all/', configuration_views.get_all_configs, name='all-configs'),

    # ========== ALERTS - USER ==========
    path('alerts/', alert_views.list_user_alerts, name='list-user-alerts'),
    path('alerts/unread-count/', alert_views.get_unread_alerts_count, name='unread-alerts-count'),
    path('alerts/<uuid:alert_id>/', alert_views.get_alert, name='get-alert'),
    path('alerts/<uuid:alert_id>/mark-read/', alert_views.mark_alert_as_read, name='mark-alert-read'),
    path('alerts/mark-multiple-read/', alert_views.mark_alerts_as_read, name='mark-alerts-read'),
    path('alerts/mark-all-read/', alert_views.mark_all_as_read, name='mark-all-read'),
    path('alerts/<uuid:alert_id>/delete/', alert_views.delete_alert, name='delete-alert'),

    # ========== ALERTS - SYSTEM (Admin) ==========
    path('alerts/system/', alert_views.list_system_alerts, name='list-system-alerts'),
    path('alerts/system/create/', alert_views.create_manual_alert, name='create-manual-alert'),
    path('alerts/system/check-low-stock/', alert_views.check_and_create_low_stock_alerts, name='check-low-stock-alerts'),
    path('alerts/statistics/', alert_views.alert_statistics, name='alert-statistics'),

    # ========== REPORTS - COMPLETE ==========
    path('reports/inventory/', reports_complete_views.inventory_report, name='inventory-report'),
    path('reports/inventory/by-department/', reports_complete_views.inventory_by_department, name='inventory-by-department'),
    path('reports/cash-movements/', reports_complete_views.cash_movements_report, name='cash-movements-report'),
    path('reports/financial-projection/', reports_complete_views.financial_projection_report, name='financial-projection'),
    path('reports/purchase-orders/', reports_complete_views.purchase_orders_report, name='purchase-orders-report'),
    path('reports/shift-closing/<uuid:shift_id>/', reports_complete_views.shift_closing_report, name='shift-closing-report'),
    
    
    path("product-suppliers/", product_supplier_views.list_product_suppliers, name="list-product-suppliers"),
    path("product-suppliers/create/", product_supplier_views.create_product_supplier, name="create-product-suppliers"),
    path("product-suppliers/<uuid:relation_id>/", product_supplier_views.update_product_supplier, name="update-product-suppliers"),
    path("product-suppliers/<uuid:relation_id>/delete/", product_supplier_views.delete_product_supplier, name="delete-product-suppliers"),
    path("product-suppliers-massive/delete/", product_supplier_views.delete_product_suppliers_massive, name="delete_product_suppliers_massive"),
    path("product-suppliers/by-product/<uuid:product_id>/", product_supplier_views.get_suppliers_by_product, name="product-suppliers"),
    path("product-suppliers/by-product-supplier/",product_supplier_views.delete_product_supplier_by_product_and_supplier,name="delete-product-supplier-by-product-supplier",),
]