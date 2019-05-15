const express = require('express');
const router = express.Router();

// route for user logout
router.get('/', (req, res) => {
    res.send(["steve", "robert", "roger"])
});

module.exports = router;
