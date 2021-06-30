const connection = require('../config/database')
const uuid = require('uuid4');
const moment = require('moment')
const LvlupApi = require('lvlup-js');
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const rcon = require("librcon");
const fetch = require('node-fetch');
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
};
function isLoggedIn(req,res,next){
	if(req.session.loggedin == true)
		return next();
    req.flash('error', 'Prosze się zalogować!')
	res.redirect('/auth');
}