var debug = require('debug'),
    path = require('path'),
    minimatch = require('minimatch'),
    gm = require('gm').subClass({ imageMagick: true }),
    util = require('util');

var haveScanned = 0;
const convert = function(options) {
  return function(files, metalsmith, done) {
    var results = {}; // don't process results of previous passes
    var ret = null; // what to return
    var pass = function(args) {
      if (!args.nameFormat) {
        if (args.resize) {
          args.nameFormat = '%b_%x_%y%e';
        } else {
          args.nameFormat = '%b%e';
        }
      }
      var ext = args.extension || '.' + args.target;
      Object.keys(files).forEach(function (file) {
        if (minimatch(file, args.src)) {
          if (results[file]) {
            haveScanned++;
            return;
          } else {
            convertFile(file, ext, args, files, results);
          }
        } else {
          haveScanned++;
        }
      });
    };

    var toScan = Object.keys(files).length;
    if (util.isArray(options)) {
      toScan *= options.length;
      options.forEach(function(opts) {
        pass(opts);
      });
    } else {
      pass(options);
    }
    
    var loop = setInterval(function() {
      if (haveScanned == toScan) {
        clearInterval(loop);
        return done(ret);
      }
    }, 5);
  };
}
function convertFile(file, ext, args, files, results) {
  var nameData = {'%e': ext};
  var currentExt = path.extname(file);
  nameData['%b'] = path.basename(file, currentExt);

  if (args.resize) {
    nameData['%x'] = args.resize.width;
    nameData['%y'] = args.resize.height;
    debug('Resizing (' + args.resize.width + 'x' + args.resize.height + ')');
    if (args.resize.crop) {
      var result = gm(files[file].contents)
                    .resize(args.resize.width, args.resize.height, '^>')
                    .gravity(args.resize.crop)
                    .extent(args.resize.width, args.resize.height);
    } else {
      var result = gm(files[file].contents).resize(args.resize.width, args.resize.height, '>');
    }
  } else {
    var result = gm(files[file].contents);
    nameData['%x'] = info.width;
    nameData['%y'] = info.height;
  }
  var newName = assembleFilename(args.nameFormat, nameData);
  debug('New name is ' + newName);
  newName = path.join(path.dirname(file), newName);

  result
    .setFormat(args.target)
    .toBuffer(function(err, buffer) {
      if (err) return debug(err);
      files[newName] = { contents: buffer };
      results[newName] = true;
      haveScanned++;
    });

  if (args.remove) {
    delete files[file];
  }
}
function assembleFilename(format, data) {
  var result = format;
  for (var key in data) {
    debug('Replacing ' + key + ' with ' + data[key]);
    result = result.replace(key, data[key]);
  }
  return result;
}

module.exports = convert;
