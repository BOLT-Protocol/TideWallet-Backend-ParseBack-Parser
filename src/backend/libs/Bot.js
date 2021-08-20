const Bots = [];

class Bot {
  constructor() {
    Bots.push(this);
  }

  init({
    config, database, logger, i18n,
  }) {
    this.config = config;
    this.database = database;
    this.logger = logger;
    this.i18n = i18n;
    return Promise.resolve(this);
  }

  start() {
    return Promise.resolve(this);
  }

  ready() {
    return Promise.resolve(this);
  }

  getBot(name) {
    const condition = new RegExp(`^${name}$`, 'i');
    const bot = Bots.find((b) => condition.test(b.name));
    return Promise.resolve(bot);
  }

  /* ----------------- */
  /* leveldb operation */

  static get isBot() {
    return true;
  }
}

const parseKey = (key) => {
  if (typeof (key) === 'string' && key.trim().length > 0) {
    return `_BOT.${key}`;
  }
};
const parseValue = (value) => {
  let formatValue;
  switch (typeof value) {
    case 'string':
      break;

    default:
  }

  return formatValue;
};

module.exports = Bot;
