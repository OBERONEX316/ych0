from odoo.tests import TransactionCase


class TestSaleApproval(TransactionCase):
    def setUp(self):
        super().setUp()
        self.company = self.env.company
        self.company.sale_auto_approve_amount_threshold = 1000
        self.company.sale_auto_approve_margin_threshold = 0
        partner = self.env['res.partner'].create({'name': 'Test Customer'})
        product = self.env['product.product'].create({'name': 'Test Product', 'list_price': 100})
        order = self.env['sale.order'].create({'partner_id': partner.id, 'expected_margin': 10})
        self.env['sale.order.line'].create({'order_id': order.id, 'product_id': product.id, 'product_uom_qty': 5, 'price_unit': 100})
        self.order = order

    def test_auto_approve_on_amount(self):
        self.order.action_submit_for_approval()
        self.assertEqual(self.order.approval_state, 'approved')

    def test_confirm_requires_approval(self):
        self.order.approval_state = 'submitted'
        with self.assertRaises(Exception):
            self.order.action_confirm()