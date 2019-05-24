const express = require('express');
const router = express.Router();

let cerveaux = [];
let chatBots = [];

const RiveScript = require("rivescript")

function loading_error(error, filename, lineno) {
  console.log("Error when loading files: " + error);
}

for(let i=0; i<2; i++){
  let cerveau = new RiveScript({utf8: true});
  cerveau.display={id:i, status:"off", cerveau:"steve", url:"http://localhost:"+(1001+i)};
  cerveau.loadDirectory("cerveaux").then(()=>{
    cerveau.sortReplies();
    console.log("cerveau finished loading")
  }).catch(loading_error);
  cerveaux.push(cerveau);
}


function createAppBot(name, cerveau){

  const appBot = express();

  appBot.use(express.json());

  appBot.post("/", (req, res)=>{
    res.send("working")
  });

  let port =1000+chatBots.length;
  appBot.listen(port, ()=>{
    console.log("bot '"+name+"' has started running on port "+port);
  });

  chatBots.push(appBot);
  return appBot;
}

// route for user logout
router.get('/', (req, res) => {
  res.send(cerveaux.map((x)=>x.display))
});

// route for user logout //todo move this on each port
router.get('/:botID/say/:message', (req, res) => {
  req.params["message"]=req.params["message"].replace(/_/g, " ");
  console.log("GET "+JSON.stringify(req.params));
  let id = parseInt(req.params["botID"]);
  cerveaux[id].reply("local", req.params["message"]).then(function(reply) {
    res.send(reply);
  });
});

module.exports = router;
