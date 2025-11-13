from odoo import api, fields, models, exceptions
import json
import hmac
import hashlib
from urllib import request, error
import logging

_logger = logging.getLogger(__name__)


class SaleOrder(models.Model):
    _inherit = "sale.order"

    approval_state = fields.Selection(
        [
            ("draft", "草稿"),
            ("submitted", "待审批"),
            ("approved", "已审批"),
            ("rejected", "已拒绝"),
        ],
        default="draft",
        tracking=True,
    )
    expected_margin = fields.Float(string="预计毛利", digits=(16, 2))
    allow_confirm_without_approval = fields.Boolean(
        string="允许无审批确认",
        default=False,
        help=False,
    )
    reject_reason = fields.Char(string="拒绝原因")

    def action_submit_for_approval(self):
        for order in self:
            if order.state not in ["draft", "sent"]:
                raise exceptions.UserError("只能提交草稿或已发送的订单")
            company = order.company_id
            auto_amount = company.sale_auto_approve_amount_threshold or 0.0
            auto_margin = company.sale_auto_approve_margin_threshold or 0.0
            if (auto_amount and order.amount_total <= auto_amount) or (
                auto_margin and order.expected_margin >= auto_margin
            ):
                order.approval_state = "approved"
                order.message_post(body="订单满足自动审批条件，已自动审批")
                order._create_activities_if_needed()
                order._send_backend_webhook("approved")
                order._log_approval_event("approved", note="自动审批")
            else:
                order.approval_state = "submitted"
                order.message_post(body="订单已提交审批")
                order._create_activities_if_needed()
                order._send_backend_webhook("submitted")
                order._log_approval_event("submitted")
        return True

    def action_approve(self):
        for order in self:
            if order.approval_state != "submitted":
                raise exceptions.UserError("订单未处于待审批状态")
            order.approval_state = "approved"
            order.reject_reason = False
            order.message_post(body="订单审批通过")
            order._send_backend_webhook("approved")
            order._log_approval_event("approved")
        return True

    def action_reject(self):
        for order in self:
            if order.approval_state != "submitted":
                raise exceptions.UserError("订单未处于待审批状态")
            order.approval_state = "rejected"
            order.message_post(body="订单审批已拒绝")
            order._send_backend_webhook("rejected")
            order._log_approval_event("rejected", note=order.reject_reason)
        return True

    def action_confirm(self):
        for order in self:
            if not order.allow_confirm_without_approval and order.approval_state != "approved":
                raise exceptions.UserError("订单需要审批后才能确认")
        res = super(SaleOrder, self).action_confirm()
        for order in self:
            order._send_backend_webhook("confirmed")
            order._log_approval_event("confirmed")
        return res

    @api.constrains("expected_margin")
    def _check_expected_margin(self):
        for order in self:
            if order.expected_margin < -1000000:
                raise exceptions.ValidationError("预计毛利异常")

    def _create_activities_if_needed(self):
        self.ensure_one()
        try:
            if self.approval_state != "submitted":
                return
            group = self.env.ref("sale_custom.group_sale_approver_custom", raise_if_not_found=False)
            act_type = self.env.ref("mail.mail_activity_data_todo", raise_if_not_found=False)
            model_id = self.env["ir.model"]._get_id("sale.order")
            if not group or not act_type or not model_id:
                return
            for user in group.users:
                self.env["mail.activity"].sudo().create({
                    "activity_type_id": act_type.id,
                    "res_model_id": model_id,
                    "res_id": self.id,
                    "user_id": user.id,
                    "summary": "审批销售订单",
                    "note": f"订单 {self.name} 待审批，金额 {self.amount_total}"
                })
        except Exception as e:
            _logger.warning("创建审批活动失败: %s", e)

    def _send_backend_webhook(self, event):
        self.ensure_one()
        try:
            icp = self.env["ir.config_parameter"].sudo()
            url = icp.get_param("sale_custom.webhook_url")
            secret = icp.get_param("sale_custom.webhook_secret")
            if not url or not secret:
                return
            payload = {
                "event": f"sale_order_{event}",
                "orderName": self.name,
                "orderId": self.id,
                "approvalState": self.approval_state,
                "state": self.state,
                "amountTotal": self.amount_total,
                "expectedMargin": self.expected_margin,
                "customer": self.partner_id.name,
                "url": (icp.get_param('web.base.url') or '') + f"/web#id={self.id}&model=sale.order&view_type=form",
            }
            data = json.dumps(payload).encode("utf-8")
            signature = hmac.new(secret.encode("utf-8"), data, hashlib.sha256).hexdigest()
            req = request.Request(url.rstrip("/") + "/approval", data=data, method="POST")
            req.add_header("Content-Type", "application/json")
            req.add_header("X-Odoo-Signature", signature)
            request.urlopen(req, timeout=3)
        except error.URLError as e:
            _logger.warning("Webhook发送失败(URLError): %s", e)
        except Exception as e:
            _logger.warning("Webhook发送失败: %s", e)

    def _log_approval_event(self, approval_state, note=None):
        self.ensure_one()
        try:
            self.env["sale.approval.log"].sudo().create({
                "order_id": self.id,
                "approval_state": approval_state,
                "expected_margin": self.expected_margin,
                "actor_id": self.env.user.id,
                "note": note or ""
            })
        except Exception as e:
            _logger.warning("记录审批日志失败: %s", e)
