const Bot = require('./Bot');

// parser
const BtcParser = require('./BtcParser');
const BtcTestnetParser = require('./BtcTestnetParser');
const BchParser = require('./BchParser');
const BchTestnetParser = require('./BchTestnetParser');
const EthParser = require('./EthParser');
const EthRopstenParser = require('./EthRopstenParser');
const CfcParser = require('./CfcParser');
const TtnParser = require('./TtnParser');

class ParserManager extends Bot {
  constructor() {
    super();
    this.name = 'ParserManager';
    this._parser = null;
  }

  init({
    config, database, logger, i18n,
  }) {
    return super
      .init({
        config,
        database,
        logger,
        i18n,
      })
      .then(() => {
        this._parser = this.createParser();
        return this;
      });
  }

  start() {
    return super.start().then(() => {
      this.startParser();
      return this;
    });
  }

  createParser() {
    const { type } = this.config.blockchain;

    /**
     * 'bitcoin_mainnet',
     * 'bitcoin_testnet',
     * 'ethereum_mainnet',
     * 'ethereum_ropsten',
     * 'cafeca'
     * 'titan'
     */
    this.logger.log(type);
    switch (type) {
      case 'bitcoin_mainnet':
        return new BtcParser(this.config, this.database, this.logger);
      case 'bitcoin_testnet':
        return new BtcTestnetParser(this.config, this.database, this.logger);
      case 'bitcoin_cash_mainnet':
        return new BchParser(this.config, this.database, this.logger);
      case 'bitcoin_cash_testnet':
        return new BchTestnetParser(this.config, this.database, this.logger);
      case 'ethereum_mainnet':
        return new EthParser(this.config, this.database, this.logger);
      case 'ethereum_ropsten':
        return new EthRopstenParser(this.config, this.database, this.logger);
      case 'cafeca':
        return new CfcParser(this.config, this.database, this.logger);
      case 'titan':
        return new TtnParser(this.config, this.database, this.logger);
      default:
        return null;
    }
  }

  startParser() {
    if (!this._parser) return Promise.reject(new Error('parser not exist.'));
    this._parser.init();
  }
}

module.exports = ParserManager;
