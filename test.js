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