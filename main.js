let fs = require('fs')
let http = require('http')

http.createServer(function (req, res) {
  console.log(req.url)
  fs.readFile(__dirname + '/dist' + req.url, function (err,data) {
    if (err) {
      console.log('backup')
      fs.readFile(__dirname + '/dist/index.html', function(err, data) {
        res.writeHead(200);
        res.end(data);
      })
    } else {
      res.writeHead(200);
      res.end(data);
    }
  });
}).listen(8080);