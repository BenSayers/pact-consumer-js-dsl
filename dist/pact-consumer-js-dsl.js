!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Pact=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var mockService = require(4);
var interaction = require(2);

var Pact = {};

// consumerName, providerName, port, pactDir
Pact.mockService = function(opts) {
  return mockService.create(opts);
};

Pact.givenInteraction = function(providerState) {
  return interaction.create().given(providerState);
};

Pact.receivingInteraction = function(description) {
  return interaction.create().uponReceiving(description);
};

module.exports = Pact;

},{}],2:[function(require,module,exports){
var interaction = {};

(function() {

  this.create = function() {
    return {
      providerState: null,
      description: '',
      request: {},
      response: {},

      given: function(providerState) {
        this.provider_state = providerState;
        return this;
      },

      uponReceiving: function(description) {
        this.description = description;
        return this;
      },

      withRequest: function(firstParameter, path, headers, body) {

        if (typeof(firstParameter) === 'object') {
          this.request.method = firstParameter.method;
          this.request.path = firstParameter.path;
          this.request.query = firstParameter.query;
          this.request.headers = firstParameter.headers;
          this.request.body = firstParameter.body;
        } else {
          this.request.method = firstParameter;
          this.request.path = path;
          this.request.headers = headers;
          this.request.body = body;
        }

        if (!this.request.method || !this.request.path) {
          throw 'pact-consumer-js-dsl\'s "withRequest" function requires "method" and "path" parameters';
        }

        return this;
      },

      willRespondWith: function(firstParameter, headers, body) {

        if (typeof(firstParameter) === 'object') {
          this.response.status = firstParameter.status;
          this.response.headers = firstParameter.headers;
          this.response.body = firstParameter.body;
        } else {
          this.response.status = firstParameter;
          this.response.headers = headers;
          this.response.body = body;
        }

        if (!this.response.status) {
          throw 'pact-consumer-js-dsl\'s "willRespondWith" function requires "status" parameter';
        }

        return this;
      }
    };
  };

}).apply(interaction);

module.exports = interaction;

},{}],3:[function(require,module,exports){
var makeRequest = function(method, url, body, callback) {
  var XMLHttpRequest = require(6);
  var xhr = new XMLHttpRequest();
  xhr.onload = function(event) {
    callback(null, event.target);
  };
  xhr.onerror = function() {
    callback(new Error('Error calling ' + url));
  };
  xhr.open(method, url, true);
  xhr.setRequestHeader('X-Pact-Mock-Service', 'true');
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(body);
};

module.exports = makeRequest;

},{}],4:[function(require,module,exports){
var mockServiceRequests = require(5);
var interaction = require(2);

var mockService = {};

(function() {


  function MockService(opts) {
    var _baseURL = 'http://127.0.0.1:' + opts.port;
    var _interactions = [];

    var _pactDetails = {
      consumer: {
        name: opts.consumer
      },
      provider: {
        name: opts.provider
      }
    };

    var setupInteractionsSequentially = function(interactions, index, callback) {
      if (index >= interactions.length) {
        callback();
        return;
      }

      mockServiceRequests.postInteraction(interactions[index], _baseURL, function(error) {
        if (error) {
          callback(error);
          return;
        }

        setupInteractionsSequentially(interactions, index + 1, callback);
      });
    };

    var cleanAndSetup = function(callback) {
      // Cleanup the interactions from the previous test
      mockServiceRequests.deleteInteractions(_baseURL, function(deleteInteractionsError) {
        if (deleteInteractionsError) {
          callback(deleteInteractionsError);
          return;
        }

        // Post the new interactions
        var interactions = _interactions;
        _interactions = []; //Clean the local setup
        setupInteractionsSequentially(interactions, 0, callback);
      });
    };

    var verifyAndWrite = function(callback) {
      //Verify that the expected interactions have occurred
      mockServiceRequests.getVerification(_baseURL, function(verifyError) {
        if (verifyError) {
          callback(verifyError);
          return;
        }

        //Write the pact file
        mockServiceRequests.postPact(_pactDetails, _baseURL, callback);
      });
    };

    var throwOnError = function(error) {
      if (error) {
        throw error;
      }
    };

    this.given = function(providerState) {
      var i = interaction.create().given(providerState);
      _interactions.push(i);
      return i;
    };

    this.uponReceiving = function(description) {
      var i = interaction.create().uponReceiving(description);
      _interactions.push(i);
      return i;
    };

    this.run = function(testFunction) {
      cleanAndSetup(function(error) {
        if (error) {
          throw error;
        }

        var runComplete = function(testComplete) {
          testComplete = (typeof testComplete === 'function') ? testComplete : throwOnError;
          verifyAndWrite(testComplete);
        };

        testFunction(runComplete); // Call the tests
      });
    };
  }

  this.create = function(opts) {
    return new MockService(opts);
  };

}).apply(mockService);

module.exports = mockService;

},{}],5:[function(require,module,exports){
var mockServiceRequests = {};
var makeRequest = require(3);

(function() {
  this.getVerification = function(baseUrl, callback) {
    makeRequest('GET', baseUrl + '/interactions/verification', null, function(error, response) {
      if (error) {
        callback(error);
      } else if (200 !== response.status) {
        callback(new Error('pact-js-dsl: Pact verification failed. ' + response.responseText));
      } else {
        callback(null);
      }
    });
  };

  this.deleteInteractions = function(baseUrl, callback) {
    makeRequest('DELETE', baseUrl + '/interactions', null, function(error, response) {
      if (error) {
        callback(error);
      } else if (200 !== response.status) {
        callback(new Error('pact-js-dsl: Pact cleanup failed. ' + response.responseText));
      } else {
        callback(null);
      }
    });
  };

  this.postInteraction = function(interaction, baseUrl, callback) {
    makeRequest('POST', baseUrl + '/interactions', JSON.stringify(interaction), function(error, response) {
      if (error) {
        callback(error);
      } else if (200 !== response.status) {
        callback(new Error('pact-js-dsl: Pact interaction setup failed. ' + response.responseText));
      } else {
        callback(null);
      }
    });
  };

  this.postPact = function(pactDetails, baseUrl, callback) {
    makeRequest('POST', baseUrl + '/pact', JSON.stringify(pactDetails), function(error, response) {
      if (error) {
        callback(error);
      } else if (200 !== response.status) {
        throw 'pact-js-dsl: Could not write the pact file. ' + response.responseText;
      } else {
        callback(null);
      }
    });
  };
}).apply(mockServiceRequests);

module.exports = mockServiceRequests;

},{}],6:[function(require,module,exports){
module.exports = XMLHttpRequest;
},{}]},{},[1])(1)
});