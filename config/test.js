const connection = require('./database')

connection.query('SELECT * FROM `shops`', function(err, result){
    console.log(result)
})