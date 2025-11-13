const express = require('express');
const { handleApprovalEvent } = require('../controllers/odooWebhookController');

const router = express.Router();

router.post('/approval', handleApprovalEvent);

module.exports = router;