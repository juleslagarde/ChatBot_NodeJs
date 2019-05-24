const express = require('express');
const path = require('path');
let bots =[];

function createAppBot(name){

    const appBot = express();

    appBot.use(express.json());

    appBot.post("/", (req, res)=>{
       res.send("working")
    });

    let port =1000+bots.length;
    appBot.listen(port, ()=>{
        console.log("bot '"+name+"' has started running on port "+port);
    });

    bots.push(appBot);
    return appBot;
}

module.exports = createAppBot;
