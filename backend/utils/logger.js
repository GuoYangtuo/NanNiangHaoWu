const logLevels = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const currentLevel = process.env.NODE_ENV === 'production' ? logLevels.INFO : logLevels.DEBUG;

const formatTimestamp = () => {
  return new Date().toISOString();
};

const formatMessage = (level, tag, message, meta = {}) => {
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${formatTimestamp()}] [${level}] [${tag}] ${message}${metaStr}`;
};

const logger = {
  error: (tag, message, meta = {}) => {
    if (currentLevel >= logLevels.ERROR) {
      console.error(formatMessage('ERROR', tag, message, meta));
    }
  },
  warn: (tag, message, meta = {}) => {
    if (currentLevel >= logLevels.WARN) {
      console.warn(formatMessage('WARN', tag, message, meta));
    }
  },
  info: (tag, message, meta = {}) => {
    if (currentLevel >= logLevels.INFO) {
      console.log(formatMessage('INFO', tag, message, meta));
    }
  },
  debug: (tag, message, meta = {}) => {
    if (currentLevel >= logLevels.DEBUG) {
      console.log(formatMessage('DEBUG', tag, message, meta));
    }
  }
};

module.exports = logger;
