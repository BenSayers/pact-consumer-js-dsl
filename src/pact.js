var mockService = require('./mockService');
var interaction = require('./interaction');

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
