const express = require('express');
const c = require('../controllers/products.controller');

const router = express.Router();

router.get('/', c.list);
router.get('/:id', c.get);
router.post('/', c.create);
router.patch('/:id', c.update);
router.delete('/:id', c.remove);
router.post('/:id/adjust-stock', c.adjust);

module.exports = router;
