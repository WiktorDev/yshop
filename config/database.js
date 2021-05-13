
var mysql = require ('mysql2');
var pool = mysql.createPool ({
    host: 'mysql1.yhost.pl',
    user: 'yourcraft',
    password: 'PUWKUrriwgk8FVfj',
    database: 'yourcraft_testowa'
});

module.exports = pool;
