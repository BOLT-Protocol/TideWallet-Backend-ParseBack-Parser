class ParserBase {
  constructor(blockchainId, config, database, logger) {
    this.bcid = blockchainId;
    this.database = database;
    this.logger = logger;
    this.config = config;

    this.blockchainModel = this.database.db.Blockchain;
    this.blockScannedModel = this.database.db.BlockScanned;
    this.currencyModel = this.database.db.Currency;
    this.sequelize = this.database.db.sequelize;
    this.Sequelize = this.database.db.Sequelize;

    this.transactionModel = this.database.db.Transaction;
    this.accountModel = this.database.db.Account;
    this.accountAddressModel = this.database.db.AccountAddress;
    this.accountCurrencyModel = this.database.db.AccountCurrency;
    this.addressTransactionModel = this.database.db.AddressTransaction;
    this.parseBackModel = this.database.db.ParseBack;
  }

  async init() {
    this.currencyInfo = await this.getCurrencyInfo();
    this.maxRetry = 3;
    this.isSyncing = false;
    await this.updateParseBackTable();

    return this;
  }

  async checkRegistAddress(address) {
    this.logger.debug(`[${this.constructor.name}] checkRegistAddress(${address})`);

    try {
      const accountAddress = await this.accountAddressModel.findOne({
        where: { address },
        include: [
          {
            model: this.accountModel,
            attributes: ['blockchain_id'],
            where: { blockchain_id: this.bcid },
          },
        ],
      });
      return accountAddress;
    } catch (error) {
      this.logger.error(`[${this.constructor.name}] checkRegistAddress(${address}) error: ${error}`);
      return Promise.reject(error);
    }
  }

  // eslint-disable-next-line no-unused-vars
  async doJob(job) {
    // need override
    await this.parseTx();
    return Promise.resolve();
  }

  async getCurrencyInfo() {
    this.logger.debug(`[${this.constructor.name}] getCurrencyInfo`);
    try {
      const result = await this.currencyModel.findOne({
        where: { blockchain_id: this.bcid, type: 1 },
        attributes: ['currency_id', 'decimals'],
      });
      return result;
    } catch (error) {
      this.logger.error(`[${this.constructor.name}] currencyModel error ${error}`);
      return {};
    }
  }

  async oneCycle() {
    // need override
    return Promise.resolve();
  }

  async getBlock() {
    this.logger.debug(`[${this.constructor.name}] getBlock`);
    try {
      let findBlock;
      await this.sequelize.transaction(async (transaction) => {
        const now = Math.floor(Date.now() / 1000);
        const oneDayAgo = now - 86400;
        console.log(oneDayAgo);
        findBlock = await this.parseBackModel.findOne({
          where: {
            done: false,
            start: {
              [this.Sequelize.Op.lt]: oneDayAgo,
            },
            retry: {
              [this.Sequelize.Op.lt]: this.maxRetry,
            },
          },
          transaction,
        });
        if (!findBlock) {
          return;
        }
        await this.parseBackModel.update({
          start: now,
        }, {
          where: {
            block: findBlock.block,
          },
          transaction,
        });
      });
      if (!findBlock) {
        return -1;
      }
      return parseInt(findBlock.block, 10);
    } catch (error) {
      this.logger.error(`[${this.constructor.name}] getBlock error: ${error}`);
      return Promise.reject(error);
    }
  }

  async setAddressTransaction(accountAddress_id, transaction_id, amount, direction, address) {
    this.logger.debug(`[${this.constructor.name}] setAddressTransaction(${accountAddress_id}, ${transaction_id}, ${direction})`);
    try {
      let result = await this.addressTransactionModel.findOne({
        where: {
          currency_id: this.currencyInfo.currency_id,
          accountAddress_id,
          transaction_id,
          amount,
          direction,
          address,
        },
      });
      if (!result) {
        result = await this.addressTransactionModel.create({
          currency_id: this.currencyInfo.currency_id,
          accountAddress_id,
          transaction_id,
          amount,
          direction,
          address,
        });
      } else {
        const updateResult = await this.addressTransactionModel.update({
          currency_id: this.currencyInfo.currency_id,
          accountAddress_id,
          transaction_id,
          amount,
          direction,
          address,
        }, {
          where: {
            addressTokenTransaction_id: result.addressTransaction_id,
          },
          returning: true,
        });
        [, [result]] = updateResult;
      }
      return result;
    } catch (error) {
      this.logger.error(`[${this.constructor.name}] setAddressTransaction(${accountAddress_id}, ${transaction_id}, ${direction}) error: ${error}`);
      return Promise.reject(error);
    }
  }

  async parseTx() {
    // need override
    const res = {};
    await this.setJobCallback(res);
    return Promise.resolve();
  }

  async parsePendingTransaction() {
    // need override
    return Promise.resolve();
  }

  async blockDataFromPeer() {
    // need override
    return Promise.resolve();
  }

  async getBlockTransaction() {
    // need override
    return Promise.resolve();
  }

  async updateParseBackTable() {
    console.log(`[${this.constructor.name}] updateParseBackTable()`);
    const blockData = await this.blockchainModel.findOne({
      where: { blockchain_id: this.bcid },
    });
    const parseBackData = await this.parseBackModel.findOne({
      order: [['block', 'DESC']],
    });
    const bBlock = parseInt(blockData.block, 10);
    const pbBlock = parseInt(parseBackData.block, 10);
    if (bBlock > pbBlock) {
      const limit = 10000;
      let step = pbBlock + 1;
      while (step < bBlock) {
        console.log('start block', step);
        const dataArr = [];
        let i = 0;
        for (; i < limit && (i + step) <= bBlock; i++) {
          dataArr.push({
            blockchain_id: this.bcid,
            block: step + i,
            done: false,
            start: 0,
            retry: 0,
          });
        }
        const result = await this.parseBackModel.bulkCreate(dataArr);
        step += i;
      }
    }
  }
}

module.exports = ParserBase;
