const express = require('express');
const router = express.Router();

var chatbots = [];

const RiveScript = require("rivescript")

function loading_error(error, filename, lineno) {
  console.log("Error when loading files: " + error);
}

for(let i=0; i<2; i++){
  let bot = new RiveScript({utf8: true});
  bot.display={id:i, status:"off", cerveau:"steve"};
  bot.loadDirectory("cerveaux").then(()=>{
    bot.sortReplies();
    console.log("bot finished loading")
  }).catch(loading_error);
  chatbots.push(bot);
}
// route for user logout
router.get('/', (req, res) => {
  res.send(chatbots)
});
// route for user logout
router.get('/:botID/say/:message', (req, res) => {
  req.params["message"]=req.params["message"].replace(/_/g, " ");
  console.log("GET "+JSON.stringify(req.params));
  let id = parseInt(req.params["botID"]);
  chatbots[id].reply("local", req.params["message"]).then(function(reply) {
    res.send(reply);
  });
});

module.exports = router;
