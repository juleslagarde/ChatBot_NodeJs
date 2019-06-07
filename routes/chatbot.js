const bodyParser = require('body-parser');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const RiveScript = require("rivescript")
const Mastodon = require('mastodon-api');

const BASE_BOT_PORT = 4001;

const router = express.Router();

let chatbots = global.chatbots = {};
let cerveaux = global.cerveaux = [];
let interfaces = global.interfaces = ["Web", "Mastodon", "Discord"];
chatbots.next_id = 0;

// Stores rive files name
fs.readdir("cerveaux/", (err, files) => {
  files.forEach(file => {
    cerveaux.push(file.split('.')[0])
  });
});

function loading_error(error, filename, lineno) {
  console.log("Error when loading files: " + error);
}

function createChatbot(name) {
  let id = chatbots.next_id++;
  let bot = {
    rive: null,
    web: null,
    mastodon: null,
    mastodon_handler: null,
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
    console.log("Rive " + cerveau + " for Chatbot(" + id + ") loaded")
  }).catch(loading_error);
}

function serviceMastodon(id, enable, access_token, url) {
  let chatbot = chatbots[id]
  if (enable != chatbot.info.mastodon) {
    if (!access_token || !url)
      return
    chatbot.info.mastodon = enable
    if (enable == "on") {
      // New mastodon connection
      let M = new Mastodon({
        access_token: access_token,
        timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
        api_url: url + '/api/v1/',
      })
      // Start a stream from mastodon listening to notifications
      chatbot.mastodon = M.stream('streaming/user')
      chatbot.mastodon_handler = function(notif) {
        if (notif.data.type == 'mention') {
          let content = notif.data.status.content
          let user = notif.data.account.username
          let reply_id = notif.data.status.id
          // Get message from html content
          // Not really pretty but it works
          // mastodon status syntax : @BotName message
          let message = content.split('</span></a></span>')[1].split('</p>')[0]
          // Get reply from rive and answer by posting reply to mastodon
          chatbot.rive.reply(user, message).then(function(reply) {
            M.post('statuses', {status: reply, in_reply_to_id : reply_id}, (err, data) => {
              if (err) {
                console.log(err);
              }
            })
          })
        }
      }
      chatbot.mastodon.on('message', chatbot.mastodon_handler)
      console.log("Chatbot(" + id + ") mastodon service opened");
    } else {
      chatbot.mastodon.removeListener('message', chatbot.mastodon_handler)
      chatbot.mastodon = null;
      chatbot.mastodon_handler = null;
      console.log("Chatbot(" + id + ") mastodon service closed");
    }
  }
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
      res.send({name: chatbots[id].info.name, message: reply});
    });
  });

  let port = BASE_BOT_PORT + parseInt(id);
  // Save server to close it later if needed
  chatbots[id].web = appBot.listen(port, () => {
    console.log("Chatbot(" + id + ") web service opened on port " + port);
  });
  chatbots[id].info.web = "on";
}

router.get('/', (req, res) => {
  res.send(Object.values(chatbots).map((x) => x.info))
});

router.post('/', (req, res) => {
  let name = (req.body.name !== '') ? req.body.name : "Steeve"
  var id = createChatbot(name)
  addCerveau(id, "simple")
  setupWeb(id)
  notif(res, "bot created (id:" + id + ")");
});

router.post('/:id', (req, res) => {
  let modified = [];
  let id = parseInt(req.params.id);
  if(chatbots[id]===undefined)
    res.send("chatbot '"+id+"' not found");
  console.log(id, chatbots[id].info);
  if (req.body.cerveau !== undefined && chatbots[id].info.cerveau !== req.body.cerveau) {
    addCerveau(id, req.body.cerveau);
    modified.push("cerveau:" + req.body.cerveau)
  }
  if (req.body.web && req.body.web !== chatbots[id].info.web) {
    if (req.body.web == "off") {
      chatbots[id].info.web = "off"
      chatbots[id].web.close()
      console.log("Chatbot(" + id + ") web service closed");
    } else {
      setupWeb(id);
    }
    modified.push("web: " + req.body.web)
  }
  if (req.body.mastodon && req.body.mastodon !== chatbots[id].info.mastodon) {
    serviceMastodon(id, req.body.mastodon, req.body.access_token, req.body.mastodon_url)
    modified.push("mastodon: " + req.body.mastodon)
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
