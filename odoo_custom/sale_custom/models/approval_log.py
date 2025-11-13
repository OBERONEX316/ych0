from odoo import fields, models


class SaleApprovalLog(models.Model):
    _name = "sale.approval.log"
    _description = "销售审批日志"
    _order = "create_date desc"
    _rec_name = "order_name"

    order_id = fields.Many2one("sale.order", string="订单", index=True, required=True)
    order_name = fields.Char(string="订单编号", related="order_id.name", store=True)
    state = fields.Selection(related="order_id.state", store=True)
    approval_state = fields.Selection([
        ("draft", "草稿"),
        ("submitted", "待审批"),
        ("approved", "已审批"),
        ("rejected", "已拒绝"),
        ("confirmed", "已确认")
    ], string="审批状态", required=True)
    amount_total = fields.Monetary(string="金额", related="order_id.amount_total", store=True)
    currency_id = fields.Many2one(related="order_id.currency_id", store=True)
    expected_margin = fields.Float(string="预计毛利")
    actor_id = fields.Many2one("res.users", string="执行人")
    note = fields.Char(string="备注")
