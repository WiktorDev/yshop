require("dotenv").config()
global.logger = require("sweet-logger")
require("./app/error")
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const app = express();
const flash = require('express-flash');
const config = require("./config/config")

app.use(require("./app/error").handler);
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('500', {
        errorid: err.message,
        error: {}
    });
});
app.use(cookieParser());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true
 }));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');

require('./app/api.js')(app);
require('./app/routes.js')(app); 
require('./app/panel.js')(app); 


app.set("PORT", config.port || 3000)
app.listen(app.get("PORT"), ()=>{
    logger.ready('Serwer zostal uruchomiony na porcie ' + app.get("PORT"));
});