const connection = require('../config/database')
var bcrypt = require('bcrypt-nodejs');
const uuid = require('uuid4');
const moment = require('moment')
const util = require('minecraft-server-util');
const LvlupApi = require('lvlup-js');
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const rcon = require("librcon");
const auth = require('./auth-api');
const e = require('express');
const nodemailer = require("nodemailer");

module.exports = function(app,passport) {

    app.use(function(req,res,next){
        res.locals.moment = moment;
        next();
    });

    app.get('/', (req,res)=>{
        res.render('homepage')
    })

    app.get('/panel/manage/:id/editproduct/:pid',isLoggedIn,(req,res)=>{
        connection.query('select * from shops where id = ?',[req.params.id], function (err, rows) {
            connection.query('select * from users where id = ?',[req.session.id], function (err, rows1) {
                connection.query("SELECT * FROM `products` WHERE pid = ?", [req.params.pid], function(err, result2){
                    if(!rows[0]){
                        req.flash('error', 'Ten sklep nie istnieje lub nie nalezy do ciebie!')
                        res.render('status')
                    }else{
                        if(rows[0].owner == rows1[0].username){
                            console.log(rows[0].owner + "" + rows1[0].username)
                            res.render('editproduct', {
                                rows: rows,
                                rows2: result2,
                                id: req.params.id,
                                pid: req.params.pid
                            })
                        }else{
                            req.flash('error', 'Ten sklep nie istnieje lub nie nalezy do ciebie!')
                            res.render('status')
                        }
                    }
                })
            });
        });
    })

    app.post('/panel/manage/:id/editproduct/:pid', (req,res)=>{
        connection.query("SELECT * FROM `products` WHERE id = ? AND pid = ?", [req.params.id, req.params.pid], function(err, result1){
            console.log(result1)
            if(result1[0].type == 'suwak'){
                connection.query("UPDATE `products` SET `name`='"+req.body.product_name+"', `price`= '" + req.body.product_price+"', `image`= '"+req.body.product_img+"', `lore`= '"+ req.body.product_lore+"', `type`= '"+req.body.product_type+"', `mincount`= '"+req.body.product_min+"', `maxcount`= '"+req.body.product_max+"' WHERE id = '"+req.params.id+"' AND pid ='"+req.params.pid+"'", function(err, result){
                    console.log(result)
                    req.flash('success', 'Pomyślnie zaktualizowano produkt o ID ' + req.params.pid)
                    res.redirect(`/panel/manage/${req.params.id}/editproduct/${req.params.pid}`)
                })
            }else{
                connection.query("UPDATE `products` SET `name`='"+req.body.product_name+"', `price`= '" + req.body.product_price+"', `image`= '"+req.body.product_img+"', `lore`= '"+ req.body.product_lore+"', `type`= '"+req.body.product_type+"' WHERE id = '"+req.params.id+"' AND pid ='"+req.params.pid+"'", function(err, result2){
                    console.log(result2)
                    req.flash('success', 'Pomyślnie zaktualizowano produkt o ID ' + req.params.pid)
                    res.redirect(`/panel/manage/${req.params.id}/editproduct/${req.params.pid}`)
                })
            }
        })
    })
    app.get('/panel/manage/:id/connection',isLoggedIn, (req, res)=>{
        connection.query('select * from shops where id = ?',[req.params.id], function (err, rows) {
            connection.query('select * from users where id = ?',[req.session.id], function (err, rows1) {
                if(!rows[0]){
                    req.flash('error', 'Ten sklep nie istnieje lub nie nalezy do ciebie!')
                    res.render('status')
                }else{
                    if(rows[0].owner == rows1[0].username){
                        console.log(rows[0].owner + "" + rows1[0].username)
                        res.render('connection', {
                            rows: rows,
                            id: req.params.id,
                            desc: rows[0].shopdesc
                        })
                    }else{
                        req.flash('error', 'Ten sklep nie istnieje lub nie nalezy do ciebie!')
                        res.render('status')
                    }
                }
            });
        });
    })

    app.get('/account/settings', isLoggedIn,(req,res)=>{
        res.send('W budowie')
    })
    app.get('/support', (req, res)=>{
        res.redirect('https://yourcraft.pl/discord')
    })
    app.get('/panel',isLoggedIn,function(req,res){
        var row = [];
        var row2=[];
        connection.query('select * from users where id = ?',[req.session.id], function (err, rows) {

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

            res.render('index.ejs', {rows : row});
        });
    });

    app.get('/shops',isLoggedIn,function(req,res){
        var row = [];
        var row2=[];
        connection.query('select * from users where id = ?',[req.session.id], function (err, rows1) {
            connection.query('select * from shops where owner = ?',[rows1[0].username], function (err, rows) {
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

                res.render('shopslist.ejs', {rows : row});
            });

        });

    });

    app.get('/shop/manage/:id',isLoggedIn,function(req,res){
        var row = [];
        var row2=[];
            connection.query('select * from shops where id = ?',[req.params.id], function (err, rows) {
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
    
                res.render('manage.ejs', {rows : row, id: req.params.id});
            });



    });
    app.get('/panel/manage/:id/addproduct',isLoggedIn,function(req,res){
        connection.query('select * from shops where id = ?',[req.params.id], function (err, rows) {
            connection.query('select * from users where id = ?',[req.session.id], function (err, rows1) {
                if(!rows[0]){
                    req.flash('error', 'Ten sklep nie istnieje lub nie nalezy do ciebie!')
                    res.render('status')
                }else{
                    if(rows[0].owner == rows1[0].username){
                        console.log(rows[0].owner + "" + rows1[0].username)
                        res.render('addproduct', {
                            rows: rows,
                            id: req.params.id
                        })
                    }else{
                        req.flash('error', 'Ten sklep nie istnieje lub nie nalezy do ciebie!')
                        res.render('status')
                    }
                }

            });
        });
    });

    app.get('/panel/manage/:id/settings',isLoggedIn,function(req,res){
        connection.query('select * from shops where id = ?',[req.params.id], function (err, rows) {
            connection.query('select * from users where id = ?',[req.session.id], function (err, rows1) {
                if(!rows[0]){
                    req.flash('error', 'Ten sklep nie istnieje lub nie nalezy do ciebie!')
                    res.render('status')
                }else{
                    if(rows[0].owner == rows1[0].username){
                        console.log(rows[0].owner + "" + rows1[0].username)
                        res.render('settings', {
                            rows: rows,
                            id: req.params.id,
                            desc: rows[0].shopdesc
                        })
                    }else{
                        req.flash('error', 'Ten sklep nie istnieje lub nie nalezy do ciebie!')
                        res.render('status')
                    }
                }

            });
        });
    });
    app.post('/panel/manage/:id/shop', function(req, res){
        connection.query("UPDATE `shops` SET `shoptitle`= '" + req.body.shop_title + "',`shopname`= '" + req.body.shop_name + "', `serverstatus`= '"+req.body.serverstatus+"', `shopcss`= '"+req.body.shop_css+"' WHERE id = '"+req.params.id+"'", function(err, result){
            console.log(result)
            req.flash('success', 'Pomyslnie zapisano zmiany')
            res.redirect(`/panel/manage/${req.params.id}/settings`)
        })
    })
    app.post('/panel/manage/:id/settings', function(req, res){
        connection.query("UPDATE `shops` SET `lvlupkey`= '" + req.body.lvlup_key + "',`shopdesc`= '" + req.body.description + "' WHERE id = '"+req.params.id+"'", function(err, result){
            console.log(result)
            req.flash('success', 'Pomyslnie zapisano zmiany')
            res.redirect(`/panel/manage/${req.params.id}/settings`)
        })
    })
    app.post('/panel/manage/:id/webhook',function(req,res){
        connection.query("UPDATE `shops` SET `webhooktitle`= '" + req.body.webhook_title + "',`webhooklore`= '" + req.body.webhook_lore + "',`webhook_url`= '" + req.body.webhook_url + "' WHERE id = '" + req.params.id + "'", function(err, result){
            console.log(result)
            req.flash('success', 'Pomyslnie zapisano zmiany')
            res.redirect(`/panel/manage/${req.params.id}/settings`)
        })
    });
    app.post('/panel/manage/:id/msg',function(req,res){
        connection.query("UPDATE `shops` SET `offmsg`= '" + req.body.offmsg + "' WHERE id = '" + req.params.id + "'", function(err, result){
            console.log(result)
            req.flash('success', 'Pomyslnie zapisano zmiany')
            res.redirect(`/panel/manage/${req.params.id}/settings`)
        })
    });
    app.post('/panel/manage/:id/connection',function(req,res){
        connection.query("UPDATE `shops` SET `serverip`= '" + req.body.server_ip + "', `serverport`='"+req.body.server_port+"', `rconport`='"+req.body.rcon_port+"', `rconpassword`='"+req.body.rcon_pass+"' WHERE id = '"+req.params.id+"'", function(err, result){
            console.log(result)
            req.flash('success', 'Pomyslnie zapisano zmiany')
            res.redirect(`/panel/manage/${req.params.id}/connection`)
        })
    });
    app.get('/panel/manage/:id/productlist',isLoggedIn,function(req,res){
        var row = [];
        var row2=[];
        connection.query('select * from products where id = ?',[req.params.id], function (err, rows) {
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

                res.render('productslist.ejs', {
                    rows : row,
                    id: req.params.id,
                    pid: rows[0].pid
                });
        });
    });

    app.post('/panel/manage/:id/addproduct', function(req, res){
        var x = Math.floor((Math.random() * 100000) + 1);
        connection.query('INSERT INTO `products`(`id`, `pid`, `name`, `price`, `image`, `lore`, `cmd`, `type`) VALUES (?,?,?,?,?,?,?,?)', [req.params.id,x, req.body.name, req.body.price, req.body.image, req.body.lore, req.body.cmd, req.body.type], function(err, result){
            req.flash('success', 'Pomyslnie dodano nowy produkt!');
            res.redirect(`/panel/manage/${req.params.id}/addproduct`);
        })

    })
    app.post('/panel', function(req, res) {
        var x = Math.floor((Math.random() * 10000) + 1);
        connection.query('select * from users where id = ?',[req.session.id], function (err, rows) {
            connection.query('INSERT INTO `shops`(`id`, `title`, `owner`, `status`, `offmsg`, `lvlupkey`, `serverip`, `serverport`, `rconport`, `rconpassword`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [x, req.body.title, rows[0].username, 'true', 'Wiadomosc nie zostala ustawiona', req.body.lvlupkey, req.body.serverip, req.body.serverport, req.body.rconport, req.body.rconpassword], function(err, result){
                if(err){
                    console.log(err)
                }
            })
            req.flash('success', 'Sklep zostal pomyslnie utworzony!')
            res.redirect('/');
        });
    });

        
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
                    const linkForPayment = await lvlup.createPayment('1.00', 'http://ab7ac2cd6b28.ngrok.io/redirect/'+req.params.id+'/'+id1, 'http://ab7ac2cd6b28.ngrok.io/webhook');
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
                connection.query("SELECT * FROM `products` WHERE id = ? AND pid = ?", [req.params.id, result2[0].pid], function(err, result3){
                    if(result2[0].paid == 'false'){
                        var nick = result2[0].nick
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
                                var cmd = res
                                let data = await rcon.send("sk givekey " + args[0] + " grabierzcy 1", "rconpassy343", "95.214.53.73", 54492);
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
    app.get('/panel/manage/:id/payments',isLoggedIn,function(req,res){
        var row = [];
        var row2=[];
        connection.query('select * from payments where id = ?',[req.params.id], function (err, rows) {
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
                res.render('paymenthistory.ejs', {
                    rows : row,
                    id: req.params.id
                });
        });
    });
    app.get('/login', function(req, res) {

        res.render('login.ejs',{ message: req.flash('loginMessage') });

    });

    app.get('/signup', function(req, res){
        res.render('signup.ejs',{message: req.flash('message')});
      });

    app.post('/signup', passport.authenticate('local-signup', {
            successRedirect: '/login',
            failureRedirect: '/signup',
            failureFlash : true 
    }));

    app.post('/login', passport.authenticate('local-login', {
            successRedirect : '/panel', 
            failureRedirect : '/login',
            failureFlash : true 
        }),
        function(req, res) {
            console.log("hello");

            if (req.body.remember) {
              req.session.cookie.maxAge = 1000 * 60 * 3;
            } else {
              req.session.cookie.expires = false;
            }
        res.redirect('/');
    });
    app.get('/logout', function(req, res) {
        req.logout();
        req.flash('success', 'Pomyślnie wylogowano!')
        res.redirect('/');
    });
    app.get('/auth', (req, res)=>{
        res.render('auth')
    })
    app.get('/auth/register', (req, res)=>{
        res.render('auth-register')
    })
    app.get('/p', (req,res)=>{
        if(req.session.loggedin == true){
            res.send('Zalogowano! ' + req.session.username)
        }else{
            req.flash('error', 'Prosze sie zalogować!')
            res.redirect('/auth')
        }
    })
    app.get('/l', (req,res)=>{
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
                        res.redirect('/p')
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
                            text: 'Twoj kod aktywacyjny to: ' + code
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

    app.get('*', (req, res)=>{
        req.flash('error', 'Ta strona nie istnieje!')
        res.render('status')
    })

};

function isLoggedIn(req,res,next){
	if(req.isAuthenticated())
		return next();
    req.flash('error', 'Prosze się zalogować!')
	res.redirect('/login');
}