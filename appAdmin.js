const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const appAdmin = express();
// parse application/x-www-form-urlencoded
appAdmin.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
appAdmin.use(bodyParser.json());

//Cross origin
appAdmin.use(cors());

const services = ["cerveaux", "chatbot", "interfaces"];
for (service of services) {
  appAdmin.use("/rest/" + service, require("./routes/" + service));
}

appAdmin.use(express.static('public'));

module.exports = appAdmin;
