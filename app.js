const express = require('express');
const path = require('path');

const app = express();

// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'pug');

app.use(express.json());

const elements = ["cerveau","chatbot"];
for(route of elements) {
    app.use("/rest/"+route, require("./routes/" + route));
}

app.use(express.static('public'));

module.exports = app;
