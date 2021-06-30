const connection = require('../config/database')
const moment = require('moment')

module.exports = function(app) {
    app.use(function(req,res,next){
        res.locals.moment = moment;
        res.locals.username = req.session.username;
        next();
    });
    app.get('/', (req,res)=>{
        connection.query("SELECT * FROM `shops`", function(err, result){
            connection.query("SELECT * FROM `products`", function(err, result1){
                connection.query("SELECT * FROM `accounts`", function(err, result2){
                    res.render('homepage', {
                        status: req.session.loggedin,
                        stat: result.length,
                        stat1: result1.length,
                        stat2: result2.length
                    })
                })
            })
        })
    })
    app.get('/account', (req,res)=>{
        res.render('auth/account', {
            status: req.session.loggedin
        })
    })
    app.get('/changelog', (req,res)=>{
        res.render('changelog', {
            status: req.session.loggedin
        })
    })
    app.get('/account/settings', isLoggedIn,(req,res)=>{
        res.send('W budowie')
    })
    app.get('/support', (req, res)=>{
        res.redirect('https://yourcraft.pl/discord')
    })
};
function isLoggedIn(req,res,next){
	if(req.session.loggedin == true)
		return next();
    req.flash('error', 'Prosze się zalogować!')
	res.redirect('/auth');
}