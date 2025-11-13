from odoo import fields, models


class ResCompany(models.Model):
    _inherit = "res.company"

    sale_auto_approve_amount_threshold = fields.Monetary(
        string="销售自动审批金额阈值",
        currency_field="currency_id",
        help="订单总额不超过该值时自动审批"
    )
    sale_auto_approve_margin_threshold = fields.Float(
        string="销售自动审批毛利阈值",
        digits=(16, 2),
        help="预计毛利不低于该值时自动审批"
    )
