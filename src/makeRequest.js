var makeRequest = function(method, url, body, callback) {
  var http = require('http');
  var parse = require('url').parse;

  var parsedUrl = parse(url);
  var requestOptions = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port,
    method: method,
    path: parsedUrl.path,
    headers: {
      'X-Pact-Mock-Service': 'true',
      'Content-Type': 'application/json'
    }
  };

  var request = http.request(requestOptions, function (response) {
    var responseText = '';

    response.on('data', function (chunk) {
      responseText += chunk.toString();
    });

    response.on('error', function (err) {
      callback(new Error('Error calling ' + url + ' - ' + err.message));
    });

    response.on('end', function () {
      callback(null, {responseText: responseText, status: response.statusCode});
    });
  });

  request.on('error', function (err) {
    callback(new Error('Error calling ' + url + ' - ' + err.message));
  });

  request.end(body || '');
};

module.exports = makeRequest;
