const connection = require('../config/database')
const moment = require('moment')

module.exports = function(app){
    app.use(function(req,res,next){
        res.locals.moment = moment;
        res.locals.username = req.session.username;
        next();
    });

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
            res.render('panel/index.ejs', {rows : row});
        });
    });
    app.post('/panel', function(req, res) {
        var x = Math.floor((Math.random() * 10000) + 1);
        connection.query('select * from users where id = ?',[req.session.id], function (err, rows) {
            connection.query('INSERT INTO `shops`(`id`, `title`, `owner`, `status`, `offmsg`, `serverip`, `serverport`, `rconport`, `rconpassword`, `theme`, `createdate`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [x, req.body.title, req.session.username, 'true', 'Wiadomosc nie zostala ustawiona', req.body.serverip, req.body.serverport, req.body.rconport, req.body.rconpassword, 'light', Date.now()], function(err, result){
                if(err){
                    console.log(err)
                }
            })
            req.flash('success', 'Sklep zostal pomyslnie utworzony!')
            res.redirect('/panel');
        });
    });

    app.get('/panel/manage/:id/productlist',isLoggedIn,function(req,res){
        var row = [];
        var row2=[];
        connection.query('select * from products where id = ?',[req.params.id], function (err, rows) {
            connection.query('select * from shops where id = ?',[req.params.id], function (err, rows2) {
                connection.query('select * from accounts where email = ?',[req.session.username], function (err, rows1) {
                        if(!rows2[0]){
                            req.flash('error', 'Ten sklep nie istnieje lub nie nalezy do ciebie!')
                            res.render('status')
                        }else{
                            if(rows2[0].owner == rows1[0].email){
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
                                if(!rows[0]){
                                    res.render('panel/productslist.ejs', {
                                        rows : row,
                                        id: req.params.id
                                    });
                                }else{
                                    res.render('panel/productslist.ejs', {
                                        rows : row,
                                        id: req.params.id,
                                        pid: rows[0].pid
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

    app.get('/panel/manage/:id/editproduct/:pid',isLoggedIn,(req,res)=>{
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
    app.get('/shop/manage/:id',isLoggedIn,function(req,res){
        var row = [];
        var row2=[];
        connection.query('select * from shops where id = ?',[req.params.id], function (err, rows) {
            connection.query('select * from accounts where email = ?',[req.session.username], function (err, rows1) {
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
                        res.render('panel/manage.ejs', {rows : row, id: req.params.id});
                    }else{
                        req.flash('error', 'Ten sklep nie istnieje lub nie nalezy do ciebie!')
                        res.render('status')
                    }
                }
            });
        });
    });

    app.get('/panel/manage/:id/connection',isLoggedIn, (req, res)=>{
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
    app.post('/panel/manage/:id/connection',function(req,res){
        connection.query("UPDATE `shops` SET `serverip`= '" + req.body.server_ip + "', `serverport`='"+req.body.server_port+"', `rconport`='"+req.body.rcon_port+"', `rconpassword`='"+req.body.rcon_pass+"' WHERE id = '"+req.params.id+"'", function(err, result){
            console.log(result)
            req.flash('success', 'Pomyslnie zapisano zmiany')
            res.redirect(`/panel/manage/${req.params.id}/connection`)
        })
    });

    app.get('/panel/manage/:id/settings',isLoggedIn,function(req,res){
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
        connection.query("UPDATE `shops` SET `shoptitle`= '" + req.body.shop_title + "',`shopname`= '" + req.body.shop_name + "', `serverstatus`= '"+req.body.serverstatus+"', `shopcss`= '"+req.body.shop_css+"', `theme` = '"+req.body.theme+"' WHERE id = '"+req.params.id+"'", function(err, result){
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
    app.post('/panel/manage/:id/webhook', isLoggedIn ,function(req,res){
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

    app.post('/shop/manage/:id/delete',function(req,res){
        connection.query("DELETE FROM `shops` WHERE id = '"+req.params.id+"'", function(err, result){
            console.log(result)
            req.flash('success', 'Pomyslnie usunieto sklep')
            res.redirect(`/panel`)
        })
    });
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
                        connection.query('select * from payments where id = ?',[req.params.id], function (err, rows2) {
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