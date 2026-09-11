function debug() {
    const log = () => {};
    log.enabled = false;
    return log;
}
debug.enabled = false;
debug.enable = () => {};
debug.disable = () => {};

module.exports = debug;
module.exports.default = debug;
