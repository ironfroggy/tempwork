var http = require('http');
var config = require('./config.js');

function cleanHeaders(headers) {
  return headers;
}

function proxyToWorker(request, response, worker, proxyUrl) {
  worker.active = true;
  var req = http.request({
      host: worker.address,
      // proxy IP
      port: worker.port,
      // proxy port
      method: request.method,
      path: proxyUrl,
      headers: cleanHeaders(request.headers),
  }, function (res) {
      res.on('data', function (data) {
          response.write(data);
      });
      res.on('end', function(){
        console.log('DONE');
        worker.active = false;
        response.end('');
      });
  });
  if (request.method === "POST") {
    request.on('data', function(data){
      req.write(data);
    })
    request.on('end', function() {
      worker.starting = false;
      req.end();
    })
  } else {
    req.end();
  }
  var ctx = this;
  var proxyArgs = arguments;
  req.on('error', function(e){
    console.log('ERROR ' + e);
    // If the worker seems to not have started yet, give it another 1 second
    if (e.code === 'ECONNREFUSED' && worker.starting) {
      console.log('try again in a second...');
      var t = (new Date() - worker.lastTime);
      if (t < (worker.timeout || config.timeout)) {
        setTimeout(() => proxyToWorker.apply(ctx, proxyArgs), 1000)
      } else {
        response.end('worker timeout');
      }
    } else {
      response.end('');
    }
  });
}

module.exports.proxyToWorker = proxyToWorker;