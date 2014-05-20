/*! QUAIL CKEditor Plugin quailjs.org | quail-lib.org/license */
/*global module:false*/
module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    bower: {
      install: { }
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      files: ['Gruntfile.js', 'src/**/*.js']
    },
    concat: {
      options: {
        banner: '<%= pkg.options.banner %>' + "\n" + ';(function($) {' + "\n",
        footer: "\n" + '})(jQuery);',
        stripBanners: true
      },
      dist: {
        src: ['src/*.js'],
        dest: 'plugin.js'
      }
    },
    uglify: {
      dist: {
        files: {
          'plugin.min.js': 'plugin.js'
        }
      },
      options: {
        banner: '<%= pkg.options.banner %>' + "\n"
      }
    }
  });
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-bower-task');

  // By default, just run tests
  grunt.registerTask('default', ['bower:install', 'jshint', 'concat', 'uglify']);
};
