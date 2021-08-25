const { v4: uuidv4 } = require('uuid');
const BigNumber = require('bignumber.js');
const dvalue = require('dvalue');
const Web3 = require('web3');
const ecrequest = require('ecrequest');
const ParserBase = require('./ParserBase');
const Utils = require('./Utils');
const ethABI = require('./abi/ethABI');

class EthParserBase extends ParserBase {
  constructor(blockchainId, config, database, logger) {
    super(blockchainId, config, database, logger);

    this.receiptModel = this.database.db.Receipt;
    this.tokenTransactionModel = this.database.db.TokenTransaction;
    this.addressTokenTransactionModel = this.database.db.AddressTokenTransaction;
    this.options = {};
  }

  async init() {
    await super.init();
    this.web3 = new Web3();
    return this;
  }

  async findOrCreateCurrency(contractAddress) {
    try {
      let currencyInDb = await this.currencyModel.findOne({
        where: { contract: contractAddress },
      });
      if (!currencyInDb) {
        const tokenInfoFromPeer = await Promise.all([
          this.getTokenNameFromPeer(contractAddress),
          this.getTokenSymbolFromPeer(contractAddress),
          this.getTokenDecimalFromPeer(contractAddress),
          this.getTokenTotalSupplyFromPeer(contractAddress),
        ]).catch((error) => Promise.reject(error));
        if (!Array.isArray(tokenInfoFromPeer) || !tokenInfoFromPeer[0] || !tokenInfoFromPeer[1] || !(tokenInfoFromPeer[2] >= 0) || !tokenInfoFromPeer[3]) throw tokenInfoFromPeer;

        let icon = `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@9ab8d6934b83a4aa8ae5e8711609a70ca0ab1b2b/32/icon/${tokenInfoFromPeer[1].toLocaleLowerCase()}.png`;
        try {
          const checkIcon = await ecrequest.get({
            protocol: 'https:',
            hostname: 'cdn.jsdelivr.net',
            port: '',
            path: `/gh/atomiclabs/cryptocurrency-icons@9ab8d6934b83a4aa8ae5e8711609a70ca0ab1b2b/32/icon/${tokenInfoFromPeer[1].toLocaleLowerCase()}.png`,
            timeout: 1000,
          });
          if (checkIcon.data.toString().indexOf('Couldn\'t find') !== -1) throw Error('Couldn\'t find');
        } catch (e) {
          icon = `${this.config.base.domain}/icon/ERC20.png`;
        }

        currencyInDb = await this.currencyModel.create({
          currency_id: uuidv4(),
          blockchain_id: this.bcid,
          name: tokenInfoFromPeer[0],
          symbol: tokenInfoFromPeer[1],
          type: 2,
          publish: false,
          decimals: tokenInfoFromPeer[2],
          total_supply: tokenInfoFromPeer[3],
          contract: contractAddress,
          icon,
        });
      }
      return currencyInDb;
    } catch (error) {
      this.logger.error(`[${this.constructor.name}] findOrCreateCurrency error: ${error}`);
      return Promise.reject(error);
    }
  }

  async getTokenNameFromPeer(address) {
    try {
      const type = 'callContract';
      const options = dvalue.clone(this.options);
      const command = '0x06fdde03'; // erc20 get name
      options.data = this.constructor.cmd({ type, address, command });
      const checkId = options.data.id;
      const data = await Utils.ETHRPC(options);
      if (data instanceof Object) {
        if (data.id !== checkId) {
          this.logger.error(`[${this.constructor.name}] getTokenNameFromPeer fail`);
          return null;
        }
        if (data.result) {
          const nameEncode = data.result;
          if (nameEncode.length !== 194) return nameEncode;
          const name = this.web3.eth.abi.decodeParameter('string', nameEncode);
          return Promise.resolve(name);
        }
      }
      this.logger.error(`[${this.constructor.name}] getTokenNameFromPeer(${address}) fail, ${JSON.stringify(data.error)}`);
      return null;
    } catch (error) {
      this.logger.error(`[${this.constructor.name}] getTokenNameFromPeer(${address}) error: ${error}`);
      return null;
    }
  }

  async getTokenSymbolFromPeer(address) {
    try {
      const type = 'callContract';
      const options = dvalue.clone(this.options);
      const command = '0x95d89b41'; // erc20 get synbol
      options.data = this.constructor.cmd({ type, address, command });
      const checkId = options.data.id;
      const data = await Utils.ETHRPC(options);
      if (data instanceof Object) {
        if (data.id !== checkId) {
          this.logger.error(`[${this.constructor.name}] getTokenSymbolFromPeer fail`);
          return null;
        }
        if (data.result) {
          const symbolEncode = data.result;
          if (symbolEncode.length !== 194) return symbolEncode;
          const symbol = this.web3.eth.abi.decodeParameter('string', symbolEncode);
          return Promise.resolve(symbol);
        }
      }
      this.logger.error(`[${this.constructor.name}] getTokenSymbolFromPeer(${address}) fail, ${JSON.stringify(data.error)}`);
      return null;
    } catch (error) {
      this.logger.error(`[${this.constructor.name}] getTokenSymbolFromPeer(${address}) error: ${error}`);
      return null;
    }
  }

  async getTokenDecimalFromPeer(address) {
    try {
      const type = 'callContract';
      const options = dvalue.clone(this.options);
      const command = '0x313ce567'; // erc20 get decimals
      options.data = this.constructor.cmd({ type, address, command });
      const checkId = options.data.id;
      const data = await Utils.ETHRPC(options);
      if (data instanceof Object) {
        if (data.id !== checkId) {
          this.logger.error(`[${this.constructor.name}] getTokenDecimalFromPeer fail`);
          return null;
        }
        const decimals = data.result;
        if (data.result) { return Promise.resolve(parseInt(decimals, 16)); }
      }
      this.logger.error(`[${this.constructor.name}] getTokenDecimalFromPeer(${address}) fail, ${JSON.stringify(data.error)}`);
      return null;
    } catch (error) {
      this.logger.error(`[${this.constructor.name}] getTokenDecimalFromPeer(${address}) error: ${error}`);
      return null;
    }
  }

  async getTokenTotalSupplyFromPeer(address) {
    try {
      const type = 'callContract';
      const options = dvalue.clone(this.options);
      const command = '0x18160ddd'; // erc20 get total supply
      options.data = this.constructor.cmd({ type, address, command });
      const checkId = options.data.id;
      const data = await Utils.ETHRPC(options);
      if (data instanceof Object) {
        if (data.id !== checkId) {
          this.logger.error(`[${this.constructor.name}] getTokenTotalSupplyFromPeer fail`);
          return null;
        }
        if (data.result) {
          const bnTotalSupply = new BigNumber(data.result, 16);
          return Promise.resolve(bnTotalSupply.toFixed());
        }
      }
      this.logger.error(`[${this.constructor.name}] getTokenTotalSupplyFromPeer(${address}) fail, ${JSON.stringify(data.error)}`);
      return null;
    } catch (error) {
      this.logger.error(`[${this.constructor.name}] getTokenTotalSupplyFromPeer(${address}) error: ${error}`);
      return null;
    }
  }

  async parseReceiptTopic(receipt, transaction) {
    this.logger.debug(`[${this.constructor.name}] parseReceiptTopic`);
    // step:
    // 1. parse log
    // 2. parse each logs topics
    // 3. check topic has 'Transfer'
    // 4. if yes, find or create currency by address
    // 5. set TokenTransaction
    // 6. check from address is regist address
    // 7. add mapping table
    // 8. check to address is regist address
    // 9. add mapping table

    try {
      const { logs } = receipt;

      for (const log of logs) {
        const { address, topics } = log;
        let { data } = log;
        if (data === '0x') data = '0';
        const abi = ethABI[topics[0]];

        // 3. check topic has 'Transfer'
        if (abi && abi.name === 'Transfer' && abi.type === 'event') {
          // 4. if yes, find or create currency by address
          const currency = await this.findOrCreateCurrency(address);

          // 5. set TokenTransaction
          const bnAmount = new BigNumber(data, 16);
          const from = Utils.parse32BytesAddress(topics[1]);
          const to = Utils.parse32BytesAddress(topics[2]);
          let tokenTransaction = await this.tokenTransactionModel.findOne({
            where: {
              currency_id: currency.currency_id, transaction_id: transaction.transaction_id,
            },
          });
          if (!tokenTransaction) {
            tokenTransaction = await this.tokenTransactionModel.create({
              transaction_id: transaction.transaction_id,
              currency_id: currency.currency_id,
              txid: transaction.txid,
              timestamp: transaction.timestamp,
              source_addresses: from,
              destination_addresses: to,
              amount: bnAmount.toFixed(),
              result: receipt.status === '0x1',
            });
          } else {
            const updateResult = await this.tokenTransactionModel.update({
              transaction_id: transaction.transaction_id,
              currency_id: currency.currency_id,
              txid: transaction.txid,
              timestamp: transaction.timestamp,
              source_addresses: from,
              destination_addresses: to,
              amount: bnAmount.toFixed(),
              result: receipt.status === '0x1',
            }, {
              where: {
                tokenTransaction_id: tokenTransaction.tokenTransaction_id,
              },
              returning: true,
            });
            [, [tokenTransaction]] = updateResult;
          }

          // 6. check from address is regist address
          const accountAddressFrom = await this.checkRegistAddress(from);
          if (accountAddressFrom) {
            // 7. add mapping table
            await this.setAddressTokenTransaction(
              currency.currency_id,
              accountAddressFrom.accountAddress_id,
              tokenTransaction.amount,
              tokenTransaction.tokenTransaction_id,
              0,
              from,
            );
            const acResult = await this.accountCurrencyModel.findOne({
              where: {
                account_id: accountAddressFrom.account_id,
                currency_id: currency.currency_id,
                number_of_external_key: '0',
                number_of_internal_key: '0',
              },
            });
            if (!acResult) {
              await this.accountCurrencyModel.create({
                accountCurrency_id: uuidv4(),
                account_id: accountAddressFrom.account_id,
                currency_id: currency.currency_id,
                balance: bnAmount.toFixed(),
                number_of_external_key: '0',
                number_of_internal_key: '0',
              });
            } else {
              await this.accountCurrencyModel.update({
                account_id: accountAddressFrom.account_id,
                currency_id: currency.currency_id,
                balance: bnAmount.toFixed(),
                number_of_external_key: '0',
                number_of_internal_key: '0',
              }, {
                where: {
                  accountCurrency_id: acResult.accountCurrency_id,
                },
                returning: true,
              });
            }
          } else {
            // 7. add mapping table
            await this.setAddressTokenTransaction(
              currency.currency_id,
              '00000000-0000-0000-0000-000000000000',
              tokenTransaction.amount,
              tokenTransaction.tokenTransaction_id,
              0,
              from,
            );
            const acResult = await this.accountCurrencyModel.findOne({
              where: {
                account_id: '00000000-0000-0000-0000-000000000000',
                currency_id: currency.currency_id,
                number_of_external_key: '0',
                number_of_internal_key: '0',
              },
            });
            if (!acResult) {
              await this.accountCurrencyModel.create({
                accountCurrency_id: uuidv4(),
                account_id: '00000000-0000-0000-0000-000000000000',
                currency_id: currency.currency_id,
                balance: bnAmount.toFixed(),
                number_of_external_key: '0',
                number_of_internal_key: '0',
              });
            } else {
              await this.accountCurrencyModel.update({
                account_id: '00000000-0000-0000-0000-000000000000',
                currency_id: currency.currency_id,
                balance: bnAmount.toFixed(),
                number_of_external_key: '0',
                number_of_internal_key: '0',
              }, {
                where: {
                  accountCurrency_id: acResult.accountCurrency_id,
                },
                returning: true,
              });
            }
          }
          // 8. check to address is regist address
          const accountAddressTo = await this.checkRegistAddress(to);
          if (accountAddressTo) {
            // 9. add mapping table
            await this.setAddressTokenTransaction(
              currency.currency_id,
              accountAddressTo.accountAddress_id,
              tokenTransaction.amount,
              tokenTransaction.tokenTransaction_id,
              1,
              to,
            );

            const acResult = await this.accountCurrencyModel.findOne({
              where: {
                account_id: accountAddressTo.account_id,
                currency_id: currency.currency_id,
                number_of_external_key: '0',
                number_of_internal_key: '0',
              },
            });
            if (!acResult) {
              await this.accountCurrencyModel.create({
                accountCurrency_id: uuidv4(),
                account_id: accountAddressTo.account_id,
                currency_id: currency.currency_id,
                balance: bnAmount.toFixed(),
                number_of_external_key: '0',
                number_of_internal_key: '0',
              });
            } else {
              await this.accountCurrencyModel.update({
                account_id: accountAddressTo.account_id,
                currency_id: currency.currency_id,
                balance: bnAmount.toFixed(),
                number_of_external_key: '0',
                number_of_internal_key: '0',
              }, {
                where: {
                  accountCurrency_id: acResult.accountCurrency_id,
                },
                returning: true,
              });
            }
          } else {
            // 9. add mapping table
            await this.setAddressTokenTransaction(
              currency.currency_id,
              '00000000-0000-0000-0000-000000000000',
              tokenTransaction.amount,
              tokenTransaction.tokenTransaction_id,
              1,
              to,
            );

            const acResult = await this.accountCurrencyModel.findOne({
              where: {
                account_id: '00000000-0000-0000-0000-000000000000',
                currency_id: currency.currency_id,
                number_of_external_key: '0',
                number_of_internal_key: '0',
              },
            });
            if (!acResult) {
              await this.accountCurrencyModel.create({
                accountCurrency_id: uuidv4(),
                account_id: '00000000-0000-0000-0000-000000000000',
                currency_id: currency.currency_id,
                balance: bnAmount.toFixed(),
                number_of_external_key: '0',
                number_of_internal_key: '0',
              });
            } else {
              await this.accountCurrencyModel.update({
                account_id: '00000000-0000-0000-0000-000000000000',
                currency_id: currency.currency_id,
                balance: bnAmount.toFixed(),
                number_of_external_key: '0',
                number_of_internal_key: '0',
              }, {
                where: {
                  accountCurrency_id: acResult.accountCurrency_id,
                },
                returning: true,
              });
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`[${this.constructor.name}] parseReceiptTopic error: ${error}`);
      return Promise.resolve(error);
    }
  }

  async oneCycle() {
    this.logger.debug(`[${this.constructor.name}] oneCycle`);
    try {
      const block = await this.getBlock();
      if (block < 0) {
        this.logger.log('All processing or all done.');
        this.block = -1;
        this.isSyncing = false;
        return Promise.resolve();
      }
      this.block = block;
      // get block data from peer
      const syncResult = await this.blockDataFromPeer(block);
      if (!syncResult) {
        // block hash or data not found
        // maybe network error or block doesn't exist
        // end this recursive
        throw new Error(`blockDataFromPeer ${block} not found`);
      }

      // 2. save block data into db
      // must success
      await this.insertBlock(syncResult);

      // sync tx and receipt
      const txs = syncResult.transactions;
      const timestamp = parseInt(syncResult.timestamp, 16);

      for (const tx of txs) {
        const receipt = await this.receiptFromPeer(tx.hash);
        await this.parseTx(tx, receipt, timestamp);
      }

      // update parseBack done
      await this.parseBackModel.update({
        done: true,
      }, {
        where: {
          block: this.block,
        },
      });

      this.block = -1;
      return Promise.resolve();
    } catch (error) {
      this.logger.error(`[${this.constructor.name}] oneCycle error: ${error}`);
      if (this.block >= 0) {
        try {
          await this.parseBackModel.update({
            start: 0,
            retry: this.Sequelize.literal('retry + 1'),
          }, {
            where: {
              block: this.block,
            },
          });
        } catch (resetError) {
          this.logger.error('reset parse', resetError);
        }
      }
      this.block = -1;
      return Promise.resolve(error);
    }
  }

  async parseTx(tx, receipt, timestamp) {
    // step:
    // 1. insert tx
    // 2. insert recript
    // 3. parse receipt to check is token transfer
    // 4. check from address is regist address
    // 5. add mapping table
    // 6. check to address is regist address
    // 7. add mapping table

    this.logger.debug(`[${this.constructor.name}] parseTx(${tx.hash})`);
    try {
      const bnAmount = new BigNumber(tx.value, 16);
      const bnGasPrice = new BigNumber(tx.gasPrice, 16);
      const bnGasUsed = new BigNumber(receipt.gasUsed, 16);
      const fee = bnGasPrice.multipliedBy(bnGasUsed).toFixed();
      let txStatus = true;
      if (receipt.status !== '0x1') {
        txStatus = false;
      }
      const [insertTx] = await this.transactionModel.findOrCreate({
        where: {
          currency_id: this.currencyInfo.currency_id,
          txid: tx.hash,
        },
        defaults: {
          currency_id: this.currencyInfo.currency_id,
          txid: tx.hash,
          timestamp,
          source_addresses: tx.from,
          destination_addresses: tx.to ? tx.to : '',
          amount: bnAmount.toFixed(),
          fee,
          note: tx.input,
          block: parseInt(tx.blockNumber, 16),
          nonce: parseInt(tx.nonce, 16),
          gas_price: bnGasPrice.toFixed(),
          gas_used: bnGasUsed.toFixed(),
          result: txStatus,
        },
      });

      await this.receiptModel.findOrCreate({
        where: {
          currency_id: this.currencyInfo.currency_id,
          transaction_id: insertTx.transaction_id,
        },
        defaults: {
          transaction_id: insertTx.transaction_id,
          currency_id: this.currencyInfo.currency_id,
          contract_address: receipt.contractAddress,
          cumulative_gas_used: parseInt(receipt.cumulativeGasUsed, 16),
          gas_used: bnGasUsed.toFixed(),
          logs: JSON.stringify(receipt.logs),
          logsBloom: receipt.logsBloom,
          status: parseInt(receipt.status, 16),
        },
      });

      const { from, to } = tx;
      // 3. parse receipt to check is token transfer
      await this.parseReceiptTopic(receipt, insertTx);

      // 4. check from address is regist address
      const accountAddressFrom = await this.checkRegistAddress(from);
      if (accountAddressFrom) {
        // 5. add mapping table
        await this.setAddressTransaction(
          accountAddressFrom.accountAddress_id,
          insertTx.transaction_id,
          insertTx.amount,
          0,
          from,
        );
      } else {
        await this.setAddressTransaction(
          '00000000-0000-0000-0000-000000000000',
          insertTx.transaction_id,
          insertTx.amount,
          0,
          from,
        );
      }

      // 6. check to address is regist address
      const accountAddressTo = await this.checkRegistAddress(to);
      if (accountAddressTo) {
        // 7. add mapping table
        await this.setAddressTransaction(
          accountAddressTo.accountAddress_id,
          insertTx.transaction_id,
          insertTx.amount,
          1,
          to,
        );
      } else {
        await this.setAddressTransaction(
          '00000000-0000-0000-0000-000000000000',
          insertTx.transaction_id,
          insertTx.amount,
          0,
          to,
        );
      }

      return true;
    } catch (error) {
      this.logger.error(`[${this.constructor.name}] parseTx(${tx.hash}) error: ${error}`);
      return Promise.reject(error);
    }
  }

  async receiptFromPeer(txid) {
    this.logger.debug(`[${this.constructor.name}] receiptFromPeer(${txid})`);
    const type = 'getReceipt';
    const options = dvalue.clone(this.options);
    options.data = this.constructor.cmd({ type, txid });
    const checkId = options.data.id;
    const data = await Utils.ETHRPC(options);
    if (data instanceof Object) {
      if (data.id !== checkId) {
        this.logger.error(`[${this.constructor.name}] receipt not found`);
        return Promise.reject();
      }
      if (data.result) {
        return Promise.resolve(data.result);
      }
    }
    this.logger.error(`[${this.constructor.name}] receipt not found. error: ${data.error}`);
    return Promise.reject(data.error);
  }

  async setAddressTokenTransaction(currency_id, accountAddress_id, amount, tokenTransaction_id, direction, address) {
    this.logger.debug(`[${this.constructor.name}] setAddressTokenTransaction(${currency_id}, ${accountAddress_id}, ${tokenTransaction_id}, ${direction})`);
    try {
      let result = await this.addressTokenTransactionModel.findOne({
        where: {
          currency_id,
          accountAddress_id,
          tokenTransaction_id,
        },
      });

      if (!result) {
        result = await this.addressTokenTransactionModel.create({
          currency_id,
          accountAddress_id,
          tokenTransaction_id,
          amount,
          direction,
          address,
        });
      } else {
        const updateResult = await this.addressTokenTransactionModel.update({
          currency_id,
          accountAddress_id,
          tokenTransaction_id,
          amount,
          direction,
          address,
        }, {
          where: {
            addressTokenTransaction_id: result.addressTokenTransaction_id,
          },
          returning: true,
        });
        [, [result]] = updateResult;
      }
      return result;
    } catch (error) {
      this.logger.error(`[${this.constructor.name}] setAddressTokenTransaction(${currency_id}, ${accountAddress_id}, ${tokenTransaction_id}, ${direction}) error: ${JSON.stringify(error)}`);
      return Promise.reject(error);
    }
  }

  async blockDataFromPeer(block) {
    this.logger.debug(`[${this.constructor.name}] blockDataFromPeer(${block})`);
    const type = 'getBlock';
    const options = dvalue.clone(this.options);
    options.data = this.constructor.cmd({ type, block });
    const checkId = options.data.id;
    let data;
    try {
      data = await Utils.ETHRPC(options);
    } catch (error) {
      return Promise.reject(error);
    }
    if (data instanceof Object) {
      if (data.id !== checkId) {
        this.logger.error(`[${this.constructor.name}] \x1b[1m\x1b[90mblock data not found\x1b[0m\x1b[21m`);
        return Promise.reject();
      }
      return Promise.resolve(data.result);
    }
    this.logger.error(`[${this.constructor.name}] \x1b[1m\x1b[90mblock data not found\x1b[0m\x1b[21m`);
    return Promise.reject();
  }

  async insertBlock(blockData) {
    this.logger.debug(`[${this.constructor.name}] insertBlock(${blockData.hash})`);

    try {
      const txs = blockData.transactions;
      const txids = [];
      for (const tx of txs) {
        txids.push(tx.hash);
      }

      let insertResult = await this.blockScannedModel.findOne({
        where: { blockchain_id: this.bcid, block: parseInt(blockData.number, 16) },
      });

      if (!insertResult) {
        insertResult = await this.blockScannedModel.create({
          blockchain_id: this.bcid,
          block: parseInt(blockData.number, 16),
          block_hash: blockData.hash,
          timestamp: parseInt(blockData.timestamp, 16),
          result: JSON.stringify(txids),
          transaction_count: txids.length,
          miner: blockData.miner,
          difficulty: new BigNumber(blockData.difficulty, 16).toFixed(),
          transactions_root: blockData.transactionsRoot,
          size: parseInt(blockData.size, 16),
          gas_used: parseInt(blockData.gasUsed, 16),
          extra_data: blockData.extraData,
          uncles: JSON.stringify(blockData.uncles),
        });
      } else {
        const updateResult = await this.blockScannedModel.update({
          blockchain_id: this.bcid,
          block: parseInt(blockData.number, 16),
          block_hash: blockData.hash,
          timestamp: parseInt(blockData.timestamp, 16),
          result: JSON.stringify(txids),
          transaction_count: txids.length,
          miner: blockData.miner,
          difficulty: new BigNumber(blockData.difficulty, 16).toFixed(),
          transactions_root: blockData.transactionsRoot,
          size: parseInt(blockData.size, 16),
          gas_used: parseInt(blockData.gasUsed, 16),
          extra_data: blockData.extraData,
          uncles: JSON.stringify(blockData.uncles),
        }, {
          where: {
            blockScanned_id: insertResult.blockScanned_id,
          },
          returning: true,
        });
        [, [insertResult]] = updateResult;
      }
      return insertResult;
    } catch (error) {
      const e = new Error(`[${this.constructor.name}] insertBlock(${blockData.hash}) error: ${error}`);
      this.logger.error(e);
      return Promise.reject(e);
    }
  }

  static cmd({
    type, address, command, txid, block,
  }) {
    let result;
    switch (type) {
      case 'callContract':
        result = {
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{
            to: address,
            data: command,
          }, 'latest'],
          id: dvalue.randomID(),
        };
        break;
      case 'getReceipt':
        result = {
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [txid],
          id: dvalue.randomID(),
        };
        break;
      case 'getBlock':
        result = {
          jsonrpc: '2.0',
          method: 'eth_getBlockByNumber',
          params: [`0x${block.toString(16)}`, true],
          id: dvalue.randomID(),
        };
        break;
      default:
        result = {};
    }
    return result;
  }
}

module.exports = EthParserBase;
