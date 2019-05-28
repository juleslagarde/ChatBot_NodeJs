var bodyParser = require('body-parser');
const express = require('express');

const BASE_BOT_PORT=4001;

const router = express.Router();

let chatbots = global.chatbots = [];
let cerveaux = global.cerveaux = ["simple"];
let interfaces = global.interfaces = ["Web", "Mastodon", "Discord"];

const RiveScript = require("rivescript")
function loading_error(error, filename, lineno) {
  console.log("Error when loading files: " + error);

}
for(let i=0; i<2; i++){
  let rive = new RiveScript({utf8: true});
  rive.display={id:i, status:"off"};
  rive.loadFile("cerveaux/simple.rive").then(()=>{
    rive.sortReplies();
    console.log("rive finished loading")
  }).catch(loading_error);
  let bot = {rive, web:null, mastodon:null, discord:null,
    info:{id:i, cerveau:"steve", url:"http://localhost:"+(BASE_BOT_PORT+i),  web:"off", mastodon:"off", discord:"off",}};
  chatbots.push(bot);
  setupWeb(i);
}

function setupWeb(id){

  const appBot = express();
  appBot.use(bodyParser.json()); // support json encoded bodies
  appBot.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

  appBot.post("/", (req, res)=>{
    // req.params["message"]=req.params["message"].replace(/_/g, " ");
    console.log("POST "+JSON.stringify(req.body));

    chatbots[id].rive.reply(req.body.login, req.body.message).then(function(reply) {
      res.send(reply);
    });
  });

  let port =BASE_BOT_PORT+id;
  appBot.listen(port, ()=>{
    console.log("bot '"+chatbots[id].name+"' has started running on port "+port);
  });

  chatbots[id].web = appBot;
  chatbots[id].info.web = "on";
}

// route for user logout
router.get('/', (req, res) => {
  res.send(chatbots.map((x)=>x.info))
});
// route for user logout
router.post('/', (req, res) => {
  res.send("todo creation de chatbot")//todo
});

// // route for user logout //todo move this on each port
// router.get('/:botID/say/:message', (req, res) => {
//   req.params["message"]=req.params["message"].replace(/_/g, " ");
//   console.log("GET "+JSON.stringify(req.params));
//   let id = parseInt(req.params["botID"]);
//
//   chatbots[id].rive.reply("local", req.params["message"]).then(function(reply) {
//     res.send(reply);
//   });
// });

module.exports = router;
