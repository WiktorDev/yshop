require("dotenv").config()
global.logger = require("sweet-logger")
var express  = require('express');
var session  = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var app = express();
var passport = require('passport');
var flash = require('connect-flash');
const flash1 = require('express-flash');
const config = require("./config")
require('./config/passport.js')(passport); 
app.use(flash1());
app.use(cookieParser());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));

app.set('view engine', 'ejs');

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true
 } ));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

require('./app/routes.js')(app, passport); 

app.set("PORT", config.port || 3000)
app.listen(app.get("PORT"), ()=>{
    logger.ready('Serwer zostal uruchomiony na porcie ' + app.get("PORT"));
}); // dc patrz