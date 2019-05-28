const express = require('express');
const path = require('path');

const appAdmin = express();

// appAdmin.set('views', path.join(__dirname, 'views'));
// appAdmin.set('view engine', 'pug');

appAdmin.use(express.json());

const elements = ["cerveaux","chatbot", "interfaces"];
for(route of elements) {
    appAdmin.use("/rest/"+route, require("./routes/" + route));
}

appAdmin.use(express.static('public'));

module.exports = appAdmin;
