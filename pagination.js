var express = require('express');
var http = require("http");
var mysql = require('mysql2');
var app = express();
var pool  = mysql.createPool({
  connectionLimit : 10,
  host: "mysql1.yhost.pl",
  user: "yourcraft",
  password: "PUWKUrriwgk8FVfj",
  database: "yourcraft_testowa",
  multipleStatements: true
});
app.get('/api/products', getAllProducts);
var server = http.createServer(app);
var port = process.env.PORT || 3000;
server.listen(port, function() {
    console.log("Server listening on port %d", port);
});
function getAllProducts(req, res){
  const limit = 20
  const page = req.query.page
  const offset = (page - 1) * limit
  const prodsQuery = "select * from payments limit "+limit+" OFFSET "+offset
  pool.getConnection(function(err, connection) {
    connection.query(prodsQuery, function (error, results) {
      connection.release();

      var jsonResult = {
        'products_page_count':'100',
        'page_number':page,
        'products':results
      }
      var myJsonString = JSON.parse(JSON.stringify(jsonResult));
      res.statusMessage = "Products for page "+page;
      res.statusCode = 200;
      res.json(myJsonString);
      res.end();
    })
  })
}