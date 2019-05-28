const express = require('express');
const router = express.Router();

// route for user logout
router.get('/', (req, res) => {
    res.send(global.cerveaux)
});

module.exports = router;
