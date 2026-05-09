const express = require('express');
const c = require('../controllers/suppliers.controller');

const router = express.Router();

router.get('/', c.list);
router.get('/:id', c.get);
router.post('/', c.create);
router.patch('/:id', c.update);
router.delete('/:id', c.remove);

module.exports = router;
