const bodyParser = require('body-parser');
const express = require('express');
const cors = require('cors');
const Mastodon = require('mastodon-api');

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

for (let i = 0; i < 2; i++) {
  var id = createChatbot("Steeve");
  addCerveau(id, "simple")
  setupWeb(id);
}

function serviceMastodon(id, enable) {
  let chatbot = chatbots[id]
  if (enable != chatbot.info.mastodon) {
    chatbot.info.mastodon = enable
    if (enable == "on") {
      let M = new Mastodon({
        client_key: '4749211550972535eff164d3b3c28b92cf6f7251cc8f3154bb4c263bdf1c1672',
        client_secret: 'c5527468b6fec34186620ed2d67e8dc8687d5df50e4ac5fb41b41e94771576b9',
        access_token: 'cecdfdbcbddbc493a373a337edcd91695151a03491d1ec2fe0e4ba0cd659ffaf',
        timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
        api_url: 'https://botsin.space/api/v1/',
      })
      // Start a stream from mastodon listening to notifications
      chatbot.mastodon = M.stream('streaming/user')
      chatbot.mastodon_handler = function(notif) {
        if (notif.data.type == 'mention') {
          let content = notif.data.status.content
          let user = notif.data.account.username
          let reply_id = notif.data.status.id
          console.log(notif)
          console.log(reply_id)
          // Get message from html content
          // Not really pretty but it works
          // mastodon status syntax : @BotName message
          let message = content.split('</span></a></span>')[1].split('</p>')[0]
          // Get reply from rive and answer by posting reply to mastodon
          chatbot.rive.reply(user, message).then(function(reply) {
            console.log(message + " / " + reply)
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
  notif(res, "bot created (id:" + id + ")");
});

router.post('/:id', (req, res) => {
  let id = req.params.id
  var modified = [];
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
    serviceMastodon(id, req.body.mastodon)
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
