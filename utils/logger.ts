const PREFIX = "[PageClipper]";

export const logger = {
  log: console.log.bind(console, PREFIX),
  info: console.info.bind(console, PREFIX),
  warn: console.warn.bind(console, PREFIX),
  error: console.error.bind(console, PREFIX),
};
