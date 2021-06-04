const connection = require('../config/database')

module.exports = function(app){

    app.get('/api/shop/', (req, res)=>{
        if(!req.query.id){
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({
                status:404,
                message: "This shop doesn't exist"
            }));
        }else{
            connection.query("SELECT * FROM `products` WHERE id = ?", [req.query.id], function(err, result){
                if(!result[0]){
                    res.setHeader('Content-Type', 'application/json');
                    res.send(JSON.stringify({
                        status:404,
                        message: "This shop doesn't exist"
                    }));
                }else{
                    res.json(result)
                }
            })
        }
    })
}