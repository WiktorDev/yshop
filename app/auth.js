const connection = require('../config/database')
const moment = require('moment')
var Recaptcha = require('express-recaptcha').RecaptchaV2;
var recaptcha = new Recaptcha(process.env.SITE_KEY, process.env.SECRET_KEY);

module.exports = function(app) {
    app.use(function(req,res,next){
        res.locals.moment = moment;
        res.locals.username = req.session.username;
        next();
    });
    app.get('/auth', (req, res)=>{
        res.render('auth/auth')
    })
    app.get('/auth/register',recaptcha.middleware.render, (req, res)=>{
        res.render('auth/auth-register',{
            captcha: res.recaptcha
        })
    })
    app.get('/logout',isLoggedIn, (req,res)=>{
        req.session.destroy()
        res.redirect('/auth')
    })
    app.post('/auth', (req,res)=>{
        var username = req.body.username;
        var password = req.body.password;
        if (username && password) {
            connection.query('SELECT * FROM accounts WHERE email = ? AND password = ?', [username, password], function(error, results, fields) {
                if (results.length > 0) {
                    if(results[0].activate == 'false'){
                        req.flash('error', 'To konto nie jest aktywowane!')
                        res.redirect('/auth')
                    }else{
                        req.session.loggedin = true;
                        req.session.username = username;
                        req.flash('success', 'Pomyślnie zalogowano!')
                        res.redirect('/panel')
                    }
                } else {
                    req.flash('error', 'Niepoprawne haslo lub uzytkownik!')
                    res.redirect('/auth')
                }
                res.end();
            });
        } else {
            req.flash('error', 'Prosze wpisac haslo i uzytkownika!')
            res.redirect('/auth')
            res.end();
        }
    })
    app.get('/auth/activate/', (req,res)=>{
        connection.query("SELECT * FROM accounts WHERE code = ?", [req.query.code], function(err,result){
            if(err)throw err;
            console.log(result)
            if(!result[0]){
                req.flash('error', 'To konto jest już aktywowane lub ten kod jest niepoprawny!')
                res.render('status')
            }else{
                connection.query("SELECT * FROM `accounts` WHERE `code`= ?", [req.query.code], function(err, result2){
                    if(result2[0].activate == 'true'){
                        req.flash('error', 'To konto jest już aktywowane lub ten kod jest niepoprawny!')
                        res.render('status')
                    }else{
                      connection.query("UPDATE `accounts` SET `activate`= 'true' WHERE code = '" + req.query.code + "'", function(err, result1){
                          req.flash('success', 'Konto zostało pomyślnie aktywowane')
                          res.redirect('/auth')
                      })
                    }
                })
            }
        })
    })
    app.post('/auth/register',recaptcha.middleware.verify, (req,res)=>{
        var code = Math.floor((Math.random() * 10000) + 1);
        var email = req.body.email;
        var username = req.body.username;
        var password = req.body.password;
        var rpassword = req.body.password_repeat;
        if(password != rpassword){
            req.flash('error', 'Podane hasla sie różnią!')
            res.redirect('/auth/register')
        }else{
            connection.query("SELECT * FROM `accounts` WHERE email = ?", [email], function(err, result1){
                if(!req.recaptcha.error){
                    if(!result1[0]){
                        connection.query("INSERT INTO `accounts`(`username`, `password`, `email`, `code`, `activate`) VALUES (?, ?, ?, ?, ?)", [username, password, email, code, 'false'], function(err, result){
                            let transporter = nodemailer.createTransport({
                                host: process.env.MAIL_HOST,
                                port: 587,
                                secure: false,
                                auth: {
                                  user: process.env.MAIL_USER,
                                  pass: process.env.MAIL_PASSWORD,
                                },
                              });
                              var mailOptions = {
                                from: process.env.MAIL_USER,
                                to: email,
                                subject: 'Aktywacja konta yshop.cf',
                                text: 'Twoj kod aktywacyjny to: ' + code + ' Aktywuj konto na: https://yshop.cf/auth/activate/?code='+code,
                                html: ''
                              };
                              transporter.sendMail(mailOptions, function(error, info){
                                if (error) {
                                  console.log(error);
                                } else {
                                  console.log('Email zostal wyslany: ' + info.response);
                                }
                            }); 
                            req.flash('success', 'Konto zostalo utworzone wejdź na swojego maila aby aktywowac konto!');
                            res.render('status');
                        })
                    }else{
                        req.flash('error', 'Ten e-mail juz istnieje w naszej bazie!')
                        res.redirect('/auth/register')
                    }
                }else{
                    req.flash('error', 'Prosze uzupelnic captche!')
                    res.redirect('/auth/register')
                }

            })
        }
    })
};
function isLoggedIn(req,res,next){
	if(req.session.loggedin == true)
		return next();
    req.flash('error', 'Prosze się zalogować!')
	res.redirect('/auth');
}