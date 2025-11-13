{
    "name": "Sale Custom Approval",
    "version": "17.0.1.0",
    "summary": "Sale order approval flow and margin fields",
    "category": "Sales",
    "depends": ["sale", "mail"],
    "data": [
        "security/sale_custom_groups.xml",
        "security/ir.model.access.csv",
        "data/ir_config_parameter.xml",
        "views/res_company_views.xml",
        "views/sale_order_views.xml",
        "views/sale_order_search.xml",
        "views/approval_log_views.xml",
        "report/sale_order_report.xml"
    ],
    "application": False,
    "license": "LGPL-3"
}
