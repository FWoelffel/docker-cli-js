"use strict";
var _ = require('lodash');
var child_process = require('child_process');
var os = require('os');
var nodeify_ts_1 = require('nodeify-ts');
var cli_table_2_json_1 = require('cli-table-2-json');
var dockermachine_cli_js_1 = require('dockermachine-cli-js');
var exec = child_process.exec;
var array2Oject = function (lines) {
    return lines.reduce(function (object, linep) {
        var line = linep.trim();
        if (line.length === 0) {
            return object;
        }
        var parts = line.split(':');
        var key = parts[0];
        var value = parts.slice(1).join(':');
        key = _.snakeCase(key);
        object[key] = value.trim();
        return object;
    }, {});
};
var extractResult = function (result) {
    var extracterArray = [
        {
            re: / build /,
            run: function (resultp) {
                var lines = resultp.raw.split(os.EOL);
                lines.forEach(function (line) {
                    var re = /Successfully built (.*)$/;
                    var str = line;
                    var m;
                    if ((m = re.exec(str)) !== null) {
                        if (m.index === re.lastIndex) {
                            re.lastIndex++;
                        }
                        resultp.success = true;
                        resultp.imageId = m[1];
                    }
                });
                resultp.response = lines;
                return resultp;
            },
        },
        {
            re: / run /,
            run: function (resultp) {
                resultp.containerId = resultp.raw.trim();
                return resultp;
            },
        },
        {
            re: / ps /,
            run: function (resultp) {
                var lines = resultp.raw.split(os.EOL);
                resultp.containerList = cli_table_2_json_1.cliTable2Json(lines);
                return resultp;
            },
        },
        {
            re: / images /,
            run: function (resultp) {
                var lines = resultp.raw.split(os.EOL);
                resultp.images = cli_table_2_json_1.cliTable2Json(lines);
                return resultp;
            },
        },
        {
            re: / network ls /,
            run: function (resultp) {
                var lines = resultp.raw.split(os.EOL);
                resultp.network = cli_table_2_json_1.cliTable2Json(lines);
                return resultp;
            },
        },
        {
            re: / inspect /,
            run: function (resultp) {
                var object = JSON.parse(resultp.raw);
                resultp.object = object;
                return resultp;
            },
        },
        {
            re: / info /,
            run: function (resultp) {
                var lines = resultp.raw.split(os.EOL);
                resultp.object = array2Oject(lines);
                return resultp;
            },
        },
    ];
    extracterArray.forEach(function (extracter) {
        var re = extracter.re;
        var str = result.command;
        var m;
        if ((m = re.exec(str)) !== null) {
            if (m.index === re.lastIndex) {
                re.lastIndex++;
            }
            return extracter.run(result);
        }
    });
    return result;
};
var Docker = (function () {
    function Docker(options) {
        if (options === void 0) { options = {
            currentWorkingDirectory: null,
            machineName: null,
        }; }
        this.options = options;
    }
    Docker.prototype.command = function (command, callback) {
        var docker = this;
        var execCommand = 'docker ';
        var machineconfig = '';
        var promise = Promise.resolve().then(function () {
            if (docker.options.machineName) {
                var dockerMachine = new dockermachine_cli_js_1.DockerMachine();
                return dockerMachine.command('config ' + docker.options.machineName).then(function (data) {
                    machineconfig = data.machine.config;
                });
            }
        }).then(function () {
            execCommand += ' ' + machineconfig + ' ' + command + ' ';
            var execOptions = {
                cwd: docker.options.currentWorkingDirectory,
                env: process.env,
                maxBuffer: 200 * 1024 * 1024,
            };
            return new Promise(function (resolve, reject) {
                exec(execCommand, execOptions, function (error, stdout, stderr) {
                    if (error) {
                        var message = "error: '" + error + "' stdout = '" + stdout + "' stderr = '" + stderr + "'";
                        console.error(message);
                        reject(message);
                    }
                    resolve({ result: stdout });
                });
            });
        }).then(function (data) {
            var result = {
                command: execCommand,
                raw: data.result,
            };
            return extractResult(result);
        });
        return nodeify_ts_1.default(promise, callback);
    };
    return Docker;
}());
exports.Docker = Docker;
var Options = (function () {
    function Options(machineName, currentWorkingDirectory) {
        this.machineName = machineName;
        this.currentWorkingDirectory = currentWorkingDirectory;
    }
    return Options;
}());
exports.Options = Options;
//# sourceMappingURL=index.js.map