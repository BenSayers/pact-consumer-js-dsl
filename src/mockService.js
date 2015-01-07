var mockServiceRequests = require('./mockServiceRequests');
var interaction = require('./interaction');

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
