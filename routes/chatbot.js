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

function addCerveau(id, cerveau) {
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
  var id = createChatbot("Steeve");
  addCerveau(id, "simple")
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
  appBot.listen(port, () => {
    console.log("bot '" + id + "' has started running on port " + port);
  });

  chatbots[id].web = appBot;
  chatbots[id].info.web = "on";
}

router.get('/', (req, res) => {
  res.send(Object.values(chatbots).map((x) => x.info))
});

router.post('/', (req, res) => {
  let name = (req.body.name !== '') ? req.body.name : "Steeve"
  var id = createChatbot(name)
  addCerveau(id, "simple")
  notif(res, "bot created (id:" + id + ")");
});

router.post('/:id', (req, res) => {
  var modified = [];
  if (req.body.cerveau !== undefined && chatbots[id].info.cerveau !== req.body.cerveau) {
    addCerveau(id, req.body.cerveau);
    modified.push("cerveau:" + req.body.cerveau)
  }
  if (req.body.web !== undefined && chatbots[id].info.web !== req.body.web) {
    setupWeb(id);
    modified.push("web:on")
  }
  notif(res, "bot '" + id + "' modified (" + modified.join(",") + ")");
});

function notif(res, message) {
  res.send(JSON.stringify({
    type: "notif",
    message: message
  }));
}

function error(res, message) {
  res.send(JSON.stringify({
    type: "error",
    message: message
  }));
}

module.exports = router;
