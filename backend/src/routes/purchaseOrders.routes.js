const express = require('express');
const c = require('../controllers/purchaseOrders.controller');

const router = express.Router();

router.get('/', c.list);
router.get('/:id', c.get);
router.post('/', c.create);
router.post('/:id/receive', c.receive);

module.exports = router;
