const express = require('express');
const router = express.Router();

var chatbots = [
    {status:"off", cerveau:"robert"},
    {status:"off", cerveau:"steve"},
];

const rive = require("rivescript")
console.log(new rive());

// route for user logout
router.get('/', (req, res) => {
    res.send(chatbots)
});
// route for user logout
router.get('/:botID/say/:message', (req, res) => {
    res.send(req.params)
});

module.exports = router;
