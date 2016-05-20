var Metalsmith   = require('metalsmith');
var jade         = require('metalsmith-jade');
var collections  = require('metalsmith-collections');
var layouts      = require('metalsmith-layouts');
var permalinks   = require('metalsmith-permalinks');
var markdown     = require('metalsmith-markdown');
var watch        = require('metalsmith-watch');
var serve        = require('metalsmith-serve');
var define       = require('metalsmith-define');
var sass         = require('metalsmith-sass');
var autoprefixer = require('metalsmith-autoprefixer');
var imagemin     = require('metalsmith-imagemin');
var convert      = require('./scripts/metalsmith-convert-gm.js');
var yaml         = require('js-yaml');
var fs           = require('fs');

var imageResolutions = [400, 600, 800, 1000, 1200, 1500, 2000, 3000, 4000];
var imageConvertions = [];
imageResolutions.forEach(function(res) {
  imageConvertions.push({
    src: 'projects/**/*.gif',
    target: 'gif',
    resize: {
      width:  res,
      height: res*3,
    },
    nameFormat: '%b_' + res + '%e',
  });
  imageConvertions.push({
    src: 'projects/**/*.png',
    target: 'png',
    resize: {
      width:  res,
      height: res*3,
    },
    nameFormat: '%b_' + res + '%e',
  });
  imageConvertions.push({
    src: 'projects/**/*.jpg',
    target: 'jpg',
    resize: {
      width:  res,
      height: res*3,
    },
    nameFormat: '%b_' + res + '%e',
  });
  imageConvertions.push({
    src: 'images/thumbnails/*.jpg',
    target: 'jpg',
    resize: {
      width:   res,
      height:  res * 0.618,
      gravity: 'NorthWest',
    },
    nameFormat: '%b_' + res + '%e',
  });
});
imageConvertions.push({
  src: 'images/thumbnails/*.jpg',
  target: 'jpg',
  resize: {
    width:   1200,
    height:  630,
    gravity: 'Center',
  },
  nameFormat: '%b_facebook%e',
});
imageConvertions.push({
  src: 'images/thumbnails/*.jpg',
  target: 'jpg',
  resize: {
    width:   800,
    height:  320,
    gravity: 'Center',
  },
  nameFormat: '%b_twitter%e',
});

Metalsmith(__dirname)
  .source('src')

  // assets
  .use(sass({
    sourceMap: true,
    sourceMapContents: true,
  }))
  .use(autoprefixer())

  // images
  .use(define({
    imageResolutions: imageResolutions,
    secret: yaml.safeLoad(fs.readFileSync('secret.yml')),
    home: 'http://charlottedann.com/',
    sized: function(filename, suffix) {
      var name = filename.split('.');
      return name[0] + '_' + suffix + '.' + name[1];
    }
  }))
  .use(convert(imageConvertions))
  .use(imagemin({
    optimizationLevel: 3,
    svgoPlugins: [{ removeViewBox: false }]
  }))

  // views
  .use(jade({
    pretty: true,
    useMetadata: true,
  }))
  .use(collections({
    projects: {
      pattern: 'projects/*.jade',
      sortBy:  'date',
      reverse: true
    },
  }))
  .use(permalinks(':title'))
  .use(layouts({
    engine: 'jade',
    directory: 'layouts'
  }))

  // server
  .use(serve())
  .use(
    watch({
      paths: {
        '${source}/**/*': true,
        'layouts/**/*':   '**/*',
      }
    })
  )

  .destination('build')
  .build(function(err) {
    if (err) throw err;
  });
