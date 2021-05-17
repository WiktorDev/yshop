const connection = require('../config/database')
var bcrypt = require('bcrypt-nodejs');
const uuid = require('uuid4');
const moment = require('moment')
const util = require('minecraft-server-util');
const LvlupApi = require('lvlup-js');
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const rcon = require("librcon");
const nodemailer = require("nodemailer");


module.exports = function(app) {

    app.use(function(req,res,next){
        res.locals.moment = moment;
        res.locals.username = req.session.username;
        next();
    });

    
    
    app.get('/', (req,res)=>{
        res.render('homepage', {
            status: req.session.loggedin
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
        var row1 = []
        connection.query('select * from shops where id = ?',[req.params.id], function (err, rows) {
            connection.query('select * from products where id = ?',[req.params.id], function (err, rows1) {
            
                    if (err) {
                        console.log(err);
                    } else {
                        if (rows.length) {
                            for (var i = 0, len = rows1.length; i < len; i++) { 
                                row1[i] = rows1[i];
                                
                            }  
                        }
                        console.log(row1);
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
                                console.log(row);
                            }
                            util.status('yourcraft.pl')
                                .then((response) => {
                                    var sta = response.onlinePlayers
                                    res.render('shops.ejs', {
                                
                                        rows : row , 
                                        rows1 : row1,
                                        desc: rows[0].shopdesc,
                                        stitle: rows[0].shoptitle,
                                        sname: rows[0].shopname,
                                        scss: rows[0].shopcss,
                                        status: sta
                                    });
                                }).catch((error) => {
                                    req.flash('error', 'Wystąpił bład podczas ładowania tego sklepu. Jeżeli jesteś administratorem tego sklepu sprawdź czy dane RCON są poprawne!')
                                    res.render('status')
                                });

                            console.log(rows[0].rconpassword)
                        }else{
                            req.flash(`error`, rows[0].offmsg)
                            res.render('shopstatus.ejs')
                        }
                    }
            });
        });
    });

    app.post('/shop/:id', (req, res)=>{
        var id1 = uuid();
        connection.query("SELECT * FROM `shops` WHERE id = ?", [req.params.id], function(err, result1){
            connection.query("INSERT INTO `payments`(`id`, `uuid`, `product`, `productid`, `nick`, `paid`, `data`) VALUES (?, ?, ?, ?, ?, ?, ?)", [req.params.id, id1, req.body.test, req.body.pid, req.body.pay, 'false', Date.now()], function(err, result){

                console.log('ID Sklepu: ' + req.params.id)
                console.log('ID Platnosci: ' + id1)
                console.log('Nick: ' + req.body.pay)
                console.log('Usluga: ' + req.body.test)
                const lvlup = new LvlupApi('cnaOsBPKVmQcBRgoJIehxVXpdpKBLzgL');
                (async () => {
                    const linkForPayment = await lvlup.createPayment('1', 'http://ab7ac2cd6b28.ngrok.io/redirect/'+req.params.id+'/'+id1, 'http://ab7ac2cd6b28.ngrok.io/webhook');
                    console.log(linkForPayment);
                    if(!req.body.count){
                        req.flash('redirect', linkForPayment.url)
                        req.flash('redirect2', 'Trwa realizacja płatności na nick <b>'+req.body.pay+'</b> i usluge <b>'+req.body.test+'</b> ' + req.body.pid)
                        res.render('status')
                    }else{
                        req.flash('redirect', linkForPayment.url)
                        req.flash('redirect2', 'Trwa realizacja płatności na nick <b>'+req.body.pay+'</b> i usluge <b>'+req.body.test+'</b> ' + req.body.count)
                        res.render('status')
                    }
                })()
            })
        })
    })

    app.get('/redirect/:id/:uuid', function(req, res){
        connection.query("SELECT * FROM `shops` WHERE `id` = ?", [req.params.id], function(err, result1){
            var txt = result1[0].webhooklore
            connection.query("SELECT * FROM `payments` WHERE id = ? AND uuid = ?", [req.params.id, req.params.uuid], function(err, result2){
                connection.query("SELECT * FROM `products` WHERE id = ? AND pid = ?", [req.params.id, result2[0].productid], function(err, result3){
                    connection.query("SELECT * FROM `shops` WHERE id = ?", [req.params.id], function(err, result4){
                        if(result2[0].paid == 'false'){
                            var nick = result2[0].nick
                            var cmd = result3[0].cmd;
                            var cmd2 = cmd.replace('{player}', nick)
                            const hook = new Webhook("https://discord.com/api/webhooks/840935155275399218/qrmo5cuMcnPVVPkFEIhiG6qgWrA9IxKYq__vPPOyyoZLvy0eQQRgXg60XW4uMrSw93Ip");
                            const embed = new MessageBuilder()
                            .setTitle('YourShop')
                            .setURL('https://localhost:3000/shop/'+req.params.id)
                            .setColor('#00b0f4')
                            .setDescription(txt.replace(/{player}/g, nick))
                            .setFooter('ID sklepu: ' + req.params.id)
                            .setTimestamp();
                            hook.send(embed);
                            (async() => {
                                try {
                                    var cmd = result3[0].cmd;
                                    var cmd2 = cmd.replace('{player}', nick)
                                    let data = await rcon.send(cmd2, "rconpassy343", "95.214.53.73", 54492);
                                    console.log(data);
                                } catch(err) {
                                console.log(err.message);
                                }
                                })();
                            connection.query("UPDATE `payments` SET `paid`='true' WHERE id = ? AND uuid = ?", [req.params.id, req.params.uuid], function(err, result3){
                                req.flash('success', `Pomyślnie dokonano zakupu!`)
                                res.render('status')
                            })
                        }else{
                            req.flash('error', 'Płatność o takim uuid została już wykonana!')
                            res.render('status')
                        }
                    })
                })
            })
        })
    })
    app.get('/auth', (req, res)=>{
        res.render('auth/auth')
    })
    app.get('/auth/register', (req, res)=>{
        res.render('auth/auth-register')
    })
    app.get('/logout', (req,res)=>{
        
        req.session.destroy();
        req.flash('success', 'Pomyslnie wylogowano!')
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
                        res.render('panel/index', {
                            username: req.session.username
                        })
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
    app.post('/auth/register', (req,res)=>{
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
                if(!result1[0]){
                    connection.query("INSERT INTO `accounts`(`username`, `password`, `email`, `code`, `activate`) VALUES (?, ?, ?, ?, ?)", [username, password, email, code, 'false'], function(err, result){
                        let transporter = nodemailer.createTransport({
                            host: "mail.yourcraft.pl",
                            port: 587,
                            secure: false,
                            auth: {
                              user: 'kontakt@yourcraft.pl',
                              pass: 'zgPC2Us*ozRdU4b',
                            },
                          });
                          
                          var mailOptions = {
                            from: 'kontakt@yourcraft.pl',
                            to: email,
                            subject: 'Aktywacja konta yshop.cf',
                            text: 'Twoj kod aktywacyjny to: ' + code + ' Aktywuj konto na: https://yshop.cf/auth/activate'
                          };
                          
                          transporter.sendMail(mailOptions, function(error, info){
                            if (error) {
                              console.log(error);
                            } else {
                              console.log('Email zostal wyslany: ' + info.response);
                            }
                          }); 
                        req.flash('success', 'Konto zostalo utworzone wejdź na swojego maila aby aktywowac konto!')
                        res.render('status')
                    })
                }else{
                    req.flash('error', 'Ten e-mail juz istnieje w naszej bazie!')
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