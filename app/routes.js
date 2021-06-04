const connection = require('../config/database')
var bcrypt = require('bcrypt-nodejs');
const uuid = require('uuid4');
const moment = require('moment')
const LvlupApi = require('lvlup-js');
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const rcon = require("librcon");
const fetch = require('node-fetch');
const mail = require("./email");
const errorhandler = require("./error").error
var Recaptcha = require('express-recaptcha').RecaptchaV2;
var recaptcha = new Recaptcha(process.env.SITE_KEY, process.env.SECRET_KEY);

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
    app.get('/shop/:id',(req,res)=>{
        var row = [];
        var row1 = [];
        var row2 = [];
        var row3 = [];
        connection.query('select * from shops where id = ?',[req.params.id], function (err, rows) {
            connection.query('select * from products where id = ?',[req.params.id], function (err, rows1) {
                connection.query("SELECT * FROM `urls` WHERE id = ?", [req.params.id], function(err, rows2){
                    connection.query("SELECT * FROM `payments` WHERE id = ? AND paid = ? ORDER BY data DESC LIMIT 5", [req.params.id, 'true'], function(err, rows3){
                        if (err) {
                            return errorhandler(err, req, res)
                        } else {
                            if (rows.length) {
                                for (var i = 0, len = rows1.length; i < len; i++) { 
                                    row1[i] = rows1[i];
                                }  
                            }
                            if (rows2.length) {
                                for (var i = 0, len = rows2.length; i < len; i++) { 
                                    row2[i] = rows2[i];
                                }  
                            }
                            if (rows3.length) {
                                for (var i = 0, len = rows3.length; i < len; i++) { 
                                    row3[i] = rows3[i];   
                                }  
                            }
                        }
                        if(!rows[0]){
                            req.flash('error', 'Ten sklep nie istnieje lub zostal wylaczony!')
                            res.render('status')
                        }else{
                            if(rows[0].status == 'true'){
                                if (err) {
                                    console.log(err);
                                } else {
                                    if (rows.length) {
                                        for (var i = 0, len = rows.length; i < len; i++) { 
                                            row[i] = rows[i];  
                                        }  
                                    }
                                }
                                fetch(`https://api.mcsrvstat.us/2/${rows[0].serverip}:${rows[0].serverport}`)
                                .then(response => response.json())
                                .then(data => {
                                    res.render('shops.ejs', {
                                        rows : row , 
                                        rows1 : row1,
                                        rows2: row2,
                                        rows3: row3,
                                        desc: rows[0].shopdesc,
                                        stitle: rows[0].shoptitle,
                                        sname: rows[0].shopname,
                                        scss: rows[0].shopcss,
                                        status: data,
                                        color: rows[0].color,
                                        serverstatus: rows[0].serverstatus
                                    });
                                })
                            }else{
                                req.flash(`error`, rows[0].offmsg)
                                res.render('shopstatus.ejs')
                            }
                        }
                    })
                })
            });
        });
    });
    app.post('/shop/:id', (req, res)=>{
        var id1 = uuid();
        connection.query("SELECT * FROM `shops` WHERE id = ?", [req.params.id], function(err, result1){
            if(!req.body.count){
                connection.query("INSERT INTO `payments`(`id`, `uuid`, `product`, `productid`, `nick`, `paid`, `data`) VALUES (?, ?, ?, ?, ?, ?, ?)", [req.params.id, id1, req.body.test, req.body.pid, req.body.pay, 'false', Date.now()], function(err, result){
                    const lvlup = new LvlupApi(result1[0].lvlupkey);
                    (async () => {
                        const linkForPayment = await lvlup.createPayment('1', 'http://113ad4ebf34a.ngrok.io/redirect/'+req.params.id+'/'+id1, 'http://ab7ac2cd6b28.ngrok.io/webhook');
                        console.log(linkForPayment);
                        if(linkForPayment.statusCode == '401'){
                            req.flash('error', 'Wystąpił błąd podczas wykonywania płatności. Prawdopodobnie nieprawidłowy klucz API lvlup')
                            res.render('status')
                        }else{
                            req.flash('redirect', linkForPayment.url)
                            req.flash('redirect2', 'Trwa realizacja płatności na nick <b>'+req.body.pay+'</b> i usluge <b>'+req.body.test+'</b> ')
                            res.render('status')
                        }
                    })()
                })
            }else{
                const lvlup = new LvlupApi(result1[0].lvlupkey);
                (async () => {
                    const linkForPayment = await lvlup.createPayment('1', 'http://6b12b92163ae.ngrok.io/redirect/'+req.params.id+'/'+id1, 'http://6b12b92163ae.ngrok.io/webhook');
                    console.log(linkForPayment);
                    console.log(await lvlup.paymentInfo(linkForPayment.id))
                    if(linkForPayment.statusCode == '401'){
                        req.flash('error', 'Wystąpił błąd podczas wykonywania płatności. Prawdopodobnie nieprawidłowy klucz API lvlup')
                        res.render('status')
                    }else{
                        connection.query("INSERT INTO `payments`(`id`, `uuid`, `lvlupID`, `product`, `productid`, `nick`, `paid`, `data`, `count`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [req.params.id, id1, linkForPayment.id, req.body.test, req.body.pid, req.body.pay, 'false', Date.now(), req.body.count], function(err, result){
                            req.flash('redirect', linkForPayment.url)
                            req.flash('redirect2', 'Trwa realizacja płatności na nick <b>'+req.body.pay+'</b> i x'+req.body.count+ ' ' + req.body.test + '</b>')
                            res.render('status')
                        })
                    }
                })()
            }
        })
    })
    app.get('/redirect/:id/:uuid', function(req, res){
        connection.query("SELECT * FROM `payments` WHERE uuid = ?", [req.params.uuid], function(err, result2){
            if(req.params.id != result2[0].id){
                req.flash('error','ID sklepu jest niepoprawne!')
                res.render('status')
            }else{
                connection.query("SELECT * FROM `shops` WHERE `id` = ?", [req.params.id], function(err, result1){
                    var txt = result1[0].webhooklore
                        connection.query("SELECT * FROM `products` WHERE id = ? AND pid = ?", [req.params.id, result2[0].productid], function(err, result3){
                            connection.query("SELECT * FROM `shops` WHERE id = ?", [req.params.id], function(err, result4){
                                if(result2[0].paid == 'false'){
                                    var nick = result2[0].nick
                                    var count = result2[0].count
                                    var cmd = result3[0].cmd;
                                    var cmd2 = cmd.replace('{player}', nick)
                                    const hook = new Webhook(result4[0].webhook_url);
                                    const embed = new MessageBuilder()
                                    .setTitle(result4[0].webhooktitle)
                                    .setURL('https://localhost:3000/shop/'+req.params.id)
                                    .setColor(result4[0].webhook_color)
                                    .setDescription(txt.replace(/{player}/g, nick))
                                    .setFooter('ID sklepu: ' + req.params.id)
                                    .setTimestamp();
                                    hook.send(embed);
                                    (async() => {
                                        try {
                                            var cmd = result3[0].cmd;
                                            var cmd2 = cmd.replace('{player}', nick).replace('{count}', count)
                                            let data = await rcon.send(cmd2, result4[0].rconpassword, result4[0].serverip, result4[0].rconport);
                                            console.log(data);
                                        } catch(err) {
                                        console.log(err.message);
                                        }
                                        })();
                                    connection.query("UPDATE `payments` SET `paid`='true' WHERE id = ? AND uuid = ?", [req.params.id, req.params.uuid], function(err, result3){
                                        connection.query("SELECT * FROM `payments` WHERE id = ?", [req.params.id], function(err, result4){
                                            connection.query("SELECT * FROM `shops` WHERE id = ?", [req.params.id], function(err, result){
                                                connection.query("SELECT * FROM `products` WHERE id = ? AND pid = ?", [req.params.id, result4[0].productid], function(err, result2){
                                                    var a = result2[0].price
                                                    var b = result[0].money
                                                    var money = a + b
                                                    connection.query("UPDATE `shops` SET `money`= '"+money+"' WHERE id = '"+req.params.id+"'", function(err, result5){
                                                        req.flash('success', `Pomyślnie dokonano zakupu!`)
                                                        res.render('status')
                                                    })
                                                })
                                            })
                                        })
                                    })
                                }else{
                                    req.flash('error', 'Płatność o takim uuid została już wykonana!')
                                    res.render('status')
                                }
                            })
                        })
                    })
            }
        })
    })
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
                            mail.sendMail(email, code);
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