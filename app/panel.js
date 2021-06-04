const connection = require('../config/database')
const moment = require('moment')
const rcon = require("librcon");
const errorhandler = require("./error").error
var Recaptcha = require('express-recaptcha').RecaptchaV2;
var recaptcha = new Recaptcha(process.env.SITE_KEY, process.env.SECRET_KEY);

module.exports = function(app){
    app.use(function(req,res,next){
        res.locals.moment = moment;
        res.locals.username = req.session.username;
        next();
    });
    app.get('/panel',isLoggedIn,recaptcha.middleware.render,function(req,res){
        var row = [];
        connection.query('select * from users where id = ?',[req.session.id], function (err, rows) {
            if (err) {
                return next(err)
            } else {
                if (rows.length) {
                    for (var i = 0, len = rows.length; i < len; i++) {
                        row[i] = rows[i];
                    } 
                }
                console.log(row);
            }
            res.render('panel/index.ejs', {
                rows : row,
                captcha: res.recaptcha
            });
        });
    });
    app.post('/panel',recaptcha.middleware.verify, function(req, res) {
        var x = Math.floor((Math.random() * 10000) + 1);
        connection.query('select * from users where id = ?',[req.session.id], function (err, rows) {
            if(!req.recaptcha.error){
                connection.query('INSERT INTO `shops`(`id`, `title`, `owner`, `status`, `offmsg`, `serverip`, `serverport`, `rconport`, `rconpassword`, `theme`, `createdate`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [x, req.body.title, req.session.username, 'true', 'Wiadomosc nie zostala ustawiona', req.body.serverip, req.body.serverport, req.body.rconport, req.body.rconpassword, 'light', Date.now()], function(err, result){
                    if(err){
                        console.log(err)
                    }
                })
                req.flash('success', 'Sklep zostal pomyslnie utworzony!')
                res.redirect('/panel');
            }else{
                req.flash('error', 'Prosze uzupelnic captche!')
                res.redirect('/panel')
            }

        });
    });

    app.get('/panel/manage/:id/productlist',isLoggedIn, recaptcha.middleware.render, function(req,res){
        var row = [];
        var row2=[];
        connection.query('select * from products where id = ?',[req.params.id], function (err, rows) {
            connection.query('select * from shops where id = ?',[req.params.id], function (err, rows2) {
                connection.query('select * from accounts where email = ?',[req.session.username], function (err, rows1) {
                    if (err) {
                        return errorhandler(err, req, res)
                    } 
                        if(!rows2[0]){
                            req.flash('error', 'Ten sklep nie istnieje lub nie nalezy do ciebie!')
                            res.render('status')
                        }else{
                            if(rows2[0].owner == rows1[0].email){
                                if (err) {
                                    return next(err)
                                }  else {
                                    if (rows.length) {
                                        for (var i = 0, len = rows.length; i < len; i++) {
                                            row[i] = rows[i];
                                        }  
                                    }
                                    console.log(row);
                                }
                                if(!rows[0]){
                                    res.render('panel/productslist.ejs', {
                                        rows : row,
                                        id: req.params.id
                                    });
                                }else{
                                    res.render('panel/productslist.ejs', {
                                        rows : row,
                                        id: req.params.id,
                                        pid: rows[0].pid,
                                        captcha: res.recaptcha
                                    });
                                }

                            }else{
                                req.flash('error', 'Ten sklep nie istnieje lub nie nalezy do ciebie!')
                                res.render('status')
                            }
                        }
                });
            });
        });
    });

    app.post('/panel/manage/:id/product/delete/:pid', isLoggedIn, recaptcha.middleware.verify, (req, res)=>{
        if(!req.recaptcha.error){
            connection.query("DELETE FROM `products` WHERE id = ? AND pid = ?", [req.params.id, req.params.pid], function(err, result){
                req.flash('success', 'Pomyślnie usunięto produkt o ID <b>'+req.params.pid+'</b>')
                res.redirect(`panel/manage/${req.params.id}/productlist`)
            })
        }else{
            req.flash('error', 'Prosze uzupełnić captche!')
            res.redirect(`/panel/manage/${req.params.id}/productlist`)
        }
    })
    app.get('/panel/manage/:id/editproduct/:pid',isLoggedIn, recaptcha.middleware.render ,(req,res)=>{
        connection.query('select * from shops where id = ?',[req.params.id], function (err, rows) {
            connection.query('select * from accounts where email = ?',[req.session.username], function (err, rows1) {
                connection.query("SELECT * FROM `products` WHERE pid = ?", [req.params.pid], function(err, result2){
                    if(!rows[0]){
                        req.flash('error', 'Ten sklep nie istnieje lub nie nalezy do ciebie!')
                        res.render('status')
                    }else{
                        if(rows[0].owner == rows1[0].email){
                            console.log(rows[0].owner + "" + rows1[0].email)
                            res.render('panel/editproduct', {
                                rows: rows,
                                rows2: result2,
                                id: req.params.id,
                                pid: req.params.pid,
                                captcha: res.recaptcha
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
    app.post('/panel/manage/:id/editproduct/:pid',isLoggedIn, recaptcha.middleware.verify, (req,res)=>{
        if(!res.recaptcha.error){
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
        }else{
            req.flash('error', 'Prosze uzupełnić captche!')
            res.redirect(`/panel/manage/${req.params.id}/editproduct/${req.params.pid}`)
        }
    })
    app.get('/shop/manage/:id',isLoggedIn, recaptcha.middleware.render,function(req,res){
        var row = [];
        var row2=[];
        connection.query('select * from shops where id = ?',[req.params.id], function (err, rows) {
            connection.query('select * from accounts where email = ?',[req.session.username], function (err, rows1) {
                connection.query("SELECT * FROM `products` WHERE id = ?", [req.params.id], function(err, rows2){
                    connection.query("SELECT * FROM `vouchers` WHERE id = ?", [req.params.id], function(err, rows3){
                        connection.query("SELECT * FROM `urls` WHERE id = ?", [req.params.id], function(err, resul4){
                            connection.query("SELECT * FROM `payments` WHERE id = ?", [req.params.id], function(err, rows5){
                                if(!rows[0]){
                                    req.flash('error', 'Ten sklep nie istnieje lub nie nalezy do ciebie!')
                                    res.render('status')
                                }else{
                                    if(rows[0].owner == rows1[0].email){
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
                                        res.render('panel/manage.ejs', {
                                            rows: row, 
                                            id: req.params.id,
                                            captcha: res.recaptcha,
                                            products: rows2.length,
                                            vouchers: rows3.length,
                                            links: resul4.length,
                                            payments: rows5.length,
                                            money: rows[0].money
                                        });
                                        console.log(req.recaptcha)
                                    }else{
                                        req.flash('error', 'Ten sklep nie istnieje lub nie nalezy do ciebie!')
                                        res.render('status')
                                    }
                                }
                            })
                        })
                    })
                })
            });
        });
    });
    app.get('/panel/manage/:id/connection',isLoggedIn,recaptcha.middleware.render, (req, res)=>{
        connection.query('select * from shops where id = ?',[req.params.id], function (err, rows) {
            connection.query('select * from accounts where email = ?',[req.session.username], function (err, rows1) {
                if(!rows[0]){
                    req.flash('error', 'Ten sklep nie istnieje lub nie nalezy do ciebie!')
                    res.render('status')
                }else{
                    if(rows[0].owner == rows1[0].email){
                        console.log(rows[0].owner + "" + rows1[0].email)
                        res.render('panel/connection', {
                            rows: rows,
                            id: req.params.id,
                            desc: rows[0].shopdesc,
                            captcha: res.recaptcha
                        })
                    }else{
                        req.flash('error', 'Ten sklep nie istnieje lub nie nalezy do ciebie!')
                        res.render('status')
                    }
                }
            });
        });
    })
    app.get('/panel/manage/:id/navigation',isLoggedIn,recaptcha.middleware.render, (req, res)=>{
        var row = [];
        connection.query('select * from shops where id = ?',[req.params.id], function (err, rows) {
            connection.query('select * from accounts where email = ?',[req.session.username], function (err, rows1) {
                connection.query("SELECT * FROM `urls` WHERE id = '"+req.params.id+"'", function(err, rows2){
                    if(!rows[0]){
                        req.flash('error', 'Ten sklep nie istnieje lub nie nalezy do ciebie!')
                        res.render('status')
                    }else{
                        if(rows[0].owner == rows1[0].email){
                            console.log(rows[0].owner + "" + rows1[0].email)
                            res.render('panel/navigation', {
                                captcha: res.recaptcha,
                                rows: rows,
                                id: req.params.id,
                                desc: rows[0].shopdesc,
                                url: rows2
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
    app.post('/panel/manage/:id/navigation',  recaptcha.middleware.verify,(req,res)=>{
        var x = Math.floor((Math.random() * 100000) + 1);
        if(!req.recaptcha.error){
            connection.query("INSERT INTO `urls`(`id`, `urlid`, `name`, `url`) VALUES (?, ?, ?, ?)",[req.params.id, x, req.body.name, req.body.url], function(err, result){
                console.log(result)
                req.flash('success', 'Pomyslnie zapisano zmiany')
                res.redirect(`/panel/manage/${req.params.id}/navigation`)
            })
        }else{
            req.flash('error', 'Prosze uzupełnić captche!')
            res.redirect(`/panel/manage/${req.params.id}/navigation`)
        }
    })
    app.post('/panel/manage/:id/shop/color', (req, res)=>{
        connection.query("UPDATE `shops` SET `color`='"+req.body.color+"' WHERE id = '"+req.params.id+"'", function(err, result){
            req.flash('success', 'Kolor sklepu został pomyślnie')
            res.redirect('/panel')
        })
    })
    app.post('/panel/manage/:id/connection',function(req,res){
        connection.query("UPDATE `shops` SET `serverip`= '" + req.body.server_ip + "', `serverport`='"+req.body.server_port+"', `rconport`='"+req.body.rcon_port+"', `rconpassword`='"+req.body.rcon_pass+"' WHERE id = '"+req.params.id+"'", function(err, result){
            console.log(result)
            req.flash('success', 'Pomyslnie zapisano zmiany')
            res.redirect(`/panel/manage/${req.params.id}/connection`)
        })
    });

    app.get('/panel/manage/:id/settings',isLoggedIn,recaptcha.middleware.render,function(req,res){
        connection.query('select * from shops where id = ?',[req.params.id], function (err, rows) {
            connection.query('select * from accounts where email = ?',[req.session.username], function (err, rows1) {
                if(!rows[0]){
                    req.flash('error', 'Ten sklep nie istnieje lub nie nalezy do ciebie!')
                    res.render('status')
                }else{
                    if(rows[0].owner == rows1[0].email){
                        console.log(rows[0].owner + "" + rows1[0].email)
                        res.render('panel/settings', {
                            rows: rows,
                            id: req.params.id,
                            desc: rows[0].shopdesc,
                            captcha: res.recaptcha
                        })
                    }else{
                        req.flash('error', 'Ten sklep nie istnieje lub nie nalezy do ciebie!')
                        res.render('status')
                    }
                }

            });
        });
    });
    app.post('/panel/manage/:id/delete/:urlid', isLoggedIn, function(req, res){
        connection.query("DELETE FROM `urls` WHERE id = ? AND urlid = ?", [req.params.id, req.params.urlid], function(err, result){
            req.flash('success', 'Pomyślnie usunięto URL o ID <b>'+req.params.urlid+'</b>')
            res.redirect(`/panel/manage/${req.params.id}/navigation`)
        })
    })
    app.post('/panel/manage/:id/shop',isLoggedIn,recaptcha.middleware.verify, function(req, res){
        if(!req.recaptcha.error){
            connection.query("UPDATE `shops` SET `shoptitle`= '" + req.body.shop_title + "',`shopname`= '" + req.body.shop_name + "', `serverstatus`= '"+req.body.serverstatus+"', `shopcss`= '"+req.body.shop_css+"', `theme` = '"+req.body.theme+"' WHERE id = '"+req.params.id+"'", function(err, result){
                console.log(result)
                req.flash('success', 'Pomyslnie zapisano zmiany')
                res.redirect(`/panel/manage/${req.params.id}/settings`)
            })
        }else{
            req.flash('error', 'Prosze uzupełnić captche!')
            res.redirect(`/panel/manage/${req.params.id}/settings`)
        }

    })
    app.post('/panel/manage/:id/settings',isLoggedIn,recaptcha.middleware.verify, function(req, res){
        if(!req.recaptcha.error){
            connection.query("UPDATE `shops` SET `lvlupkey`= '" + req.body.lvlup_key + "',`shopdesc`= '" + req.body.description + "' WHERE id = '"+req.params.id+"'", function(err, result){
                console.log(result)
                req.flash('success', 'Pomyslnie zapisano zmiany')
                res.redirect(`/panel/manage/${req.params.id}/settings`)
            })
        }else{
            req.flash('error', 'Prosze uzupełnić captche!')
            res.redirect(`/panel/manage/${req.params.id}/settings`)
        }
    })
    app.post('/panel/manage/:id/webhook', isLoggedIn, recaptcha.middleware.verify ,function(req,res){
        if(!req.recaptcha.error){
            connection.query("UPDATE `shops` SET `webhooktitle`= '" + req.body.webhook_title + "',`webhooklore`= '" + req.body.webhook_lore + "', `webhook_color` = '"+req.body.webhook_color+"',`webhook_url`= '" + req.body.webhook_url + "' WHERE id = '" + req.params.id + "'", function(err, result){
                console.log(result)
                req.flash('success', 'Pomyslnie zapisano zmiany')
                res.redirect(`/panel/manage/${req.params.id}/settings`)
            })
        }else{
            req.flash('error', 'Prosze uzupełnić captche!')
            res.redirect(`/panel/manage/${req.params.id}/settings`)
        }
    });
    app.post('/panel/manage/:id/msg',isLoggedIn,recaptcha.middleware.verify, function(req,res){
        if(!req.recaptcha.error){
            connection.query("UPDATE `shops` SET `offmsg`= '" + req.body.offmsg + "' WHERE id = '" + req.params.id + "'", function(err, result){
                console.log(result)
                req.flash('success', 'Pomyslnie zapisano zmiany')
                res.redirect(`/panel/manage/${req.params.id}/settings`)
            })
        }else{
            req.flash('error', 'Prosze uzupełnić captche!')
            res.redirect(`/panel/manage/${req.params.id}/settings`)
        }
    });
    app.post('/shop/manage/:id/delete',isLoggedIn, recaptcha.middleware.verify, function(req,res){
        if(!req.recaptcha.error){
            connection.query("DELETE FROM `shops` WHERE id = '"+req.params.id+"'", function(err, result){
                console.log(result)
                req.flash('success', 'Pomyslnie usunieto sklep')
                res.redirect(`/panel`)
            })
        }else{
            req.flash('error', 'Prosze uzupełnić captche!')
            res.redirect(`/shop/manage/${req.params.id}`)
        }
    });
    app.post('/panel/manage/:id/connection/test', function(req, res){
        connection.query("SELECT * FROM `shops` WHERE id = ?", [req.params.id], function(err, result){
            (async() => {
                try {
                    let data = await rcon.send('say test', result[0].rconpassword, result[0].serverip, result[0].rconport);
                    req.flash('success', 'Pomyslnie nawiazano polaczenie z RCON')
                    res.redirect(`/panel/manage/${req.params.id}/connection`)
                    console.log(data);
                } catch(err) {
                    req.flash('error', 'Nie mozna nawiazac polaczenia z RCON!')
                    res.redirect(`/panel/manage/${req.params.id}/connection`)
                    console.log( result[0].rconpassword + '' + result[0].serverip + '' + result[0].rconport)
                    console.log(err.message);
                }
            })();
        })
    })
    app.get('/panel/manage/:id/addproduct',isLoggedIn,function(req,res){
        connection.query('select * from shops where id = ?',[req.params.id], function (err, rows) {
            connection.query('select * from accounts where email = ?',[req.session.username], function (err, rows1) {
                if(!rows[0]){
                    req.flash('error', 'Ten sklep nie istnieje lub nie nalezy do ciebie!')
                    res.render('status')
                }else{
                    if(rows[0].owner == rows1[0].email){
                        console.log(rows[0].owner + "" + rows1[0].username)
                        res.render('panel/addproduct', {
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
    app.post('/panel/manage/:id/addproduct', function(req, res){
        var x = Math.floor((Math.random() * 100000) + 1);
        connection.query('INSERT INTO `products`(`id`, `pid`, `name`, `price`, `image`, `lore`, `cmd`, `type`) VALUES (?,?,?,?,?,?,?,?)', [req.params.id,x, req.body.name, req.body.price, req.body.image, req.body.lore, req.body.cmd, req.body.type], function(err, result){
            req.flash('success', 'Pomyslnie dodano nowy produkt!');
            res.redirect(`/panel/manage/${req.params.id}/addproduct`);
        });
    });

    app.get('/panel/manage/:id/payments',isLoggedIn,function(req,res){
        connection.query('select * from shops where id = ?',[req.params.id], function (err, rows) {
            connection.query('select * from accounts where email = ?',[req.session.username], function (err, rows1) {
                if(!rows[0]){
                    req.flash('error', 'Ten sklep nie istnieje lub nie nalezy do ciebie!')
                    res.render('status')
                }else{
                    if(rows[0].owner == rows1[0].email){
                        var row = [];
                        var row2=[];
                        connection.query('select * from payments where id = ? ORDER BY data DESC',[req.params.id], function (err, rows2) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    if (rows2.length) {
                                        for (var i = 0, len = rows2.length; i < len; i++) {
                                            row[i] = rows2[i];
                                        }  
                                    }
                                    console.log(row);
                                }
                                res.render('panel/paymenthistory.ejs', {
                                    rows : row,
                                    id: req.params.id
                                });
                        });
                    }else{
                        req.flash('error', 'Ten sklep nie istnieje lub nie nalezy do ciebie!')
                        res.render('status')
                    }
                }
            });
        });
    });

    app.get('/shops',isLoggedIn,function(req,res){
        var row = [];
        var row2=[];
        connection.query('select * from accounts where email = ?',[req.session.username], function (err, rows1) {
            connection.query('select * from shops where owner = ?',[req.session.username], function (err, rows) {
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
                res.render('panel/shopslist.ejs', {rows : row});
            });
        });
    });

    app.get('*', (req, res)=>{
        req.flash('error', 'Ta strona nie istnieje!')
        res.render('status')
    })
}
function isLoggedIn(req,res,next){
	if(req.session.loggedin == true)
		return next();
    req.flash('error', 'Prosze się zalogować!')
	res.redirect('/auth');
}
  