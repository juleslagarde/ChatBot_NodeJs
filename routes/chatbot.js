const bodyParser = require('body-parser');
const express = require('express');
const cors = require('cors');

const BASE_BOT_PORT = 4001;

const router = express.Router();

let chatbots = global.chatbots = {};
let cerveaux = global.cerveaux = ["simple", "simple_copy"];
let interfaces = global.interfaces = ["Web", "Mastodon", "Discord"];

chatbots.next_id = 0;

const RiveScript = require("rivescript")

function loading_error(error, filename, lineno) {
  console.log("Error when loading files: " + error);

}

function createChatbot(name) {
  let id = chatbots.next_id++;
  let bot = {
    rive: null,
    web: null,
    mastodon: null,
    discord: null,
    info: {
      id: id,
      name: name,
      cerveau: null,
      url: "http://localhost:" + (BASE_BOT_PORT + id),
      web: "off",
      mastodon: "off",
      discord: "off",
    }
  };
  chatbots[id] = bot;
  return id;
}

function setCerveau(id, cerveau) {
  let rive = new RiveScript({
    utf8: true
  });
  rive.display = {
    id: id,
    status: "off"
  };
  rive.loadFile("cerveaux/" + cerveau + ".rive").then(() => {
    rive.sortReplies();
    chatbots[id].info.cerveau = cerveau;
    chatbots[id].rive = rive;
    console.log("rive finished loading")
  }).catch(loading_error);
}

for (let i = 0; i < 2; i++) {
  let id = createChatbot("Steeve");
  setCerveau(id, "simple")
  setupWeb(id);
}

function setupWeb(id) {

  const appBot = express();
  appBot.use(bodyParser.json()); // support json encoded bodies
  appBot.use(bodyParser.urlencoded({extended: true})); // support encoded bodies
  appBot.use(cors()); // support encoded bodies

  appBot.post("/", (req, res) => {
    let {login, message} = req.body;
    // req.params["message"]=req.params["message"].replace(/_/g, " ");
    console.log("POST " + JSON.stringify(req.body));

    chatbots[id].rive.reply(login, message).then(function(reply) {
      res.send(reply);
    });
  });

  let port = BASE_BOT_PORT + id;
  let server = appBot.listen(port, () => {
    console.log("bot '" + id + "' has started running on port " + port);
  });

  chatbots[id].web = server;
  chatbots[id].info.web = "on";
}

function chatbotInfos() {
  return Object.values(chatbots).map((x) => x.info);
}

router.get('/', (req, res) => {
  res.send(chatbotInfos())
});

router.post('/', (req, res) => {
  let name = (req.body.name !== '') ? req.body.name : "Steeve"
  let id = createChatbot(name)
  setCerveau(id, "simple")
  res.send("bot '"+name+"' created (id:" + id + ")");
});

router.post('/:id', (req, res) => {
  console.log(req.body);
  let modified = [];
  let id = parseInt(req.params.id);
  if(chatbots[id]===undefined)
    res.send("chatbot '"+id+"' not found");
  console.log(id, chatbots[id].info);
  if (req.body.cerveau !== undefined && chatbots[id].info.cerveau !== req.body.cerveau) {
    setCerveau(id, req.body.cerveau);
    modified.push("cerveau:" + req.body.cerveau)
  }
  if (req.body.web !== undefined && chatbots[id].info.web !== req.body.web) {
    setupWeb(id);
    modified.push("web:on")
  }
  if (req.body.web === undefined && chatbots[id].info.web === "on") {
    chatbots[id].web.close();
    chatbots[id].web=null;
    chatbots[id].info.web="off";
    modified.push("web:off")
  }
  res.send("bot '" + id + "' modified (" + modified.join(",") + ")");
});


module.exports = router;
