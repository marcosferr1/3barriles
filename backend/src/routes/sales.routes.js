const express = require('express');
const c = require('../controllers/sales.controller');

const router = express.Router();

router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', c.get);
router.patch('/:id', c.patch);
router.delete('/:id', c.destroy);

module.exports = router;
