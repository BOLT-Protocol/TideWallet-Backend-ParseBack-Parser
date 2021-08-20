const BchParserBase = require('./BchParserBase');

class BchParser extends BchParserBase {
  constructor(config, database, logger) {
    super('80000091', config, database, logger);

    this.options = config.blockchain.bitcoin_cash_mainnet;
  }
}

module.exports = BchParser;
