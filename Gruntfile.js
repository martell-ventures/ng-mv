module.exports = function(grunt) {
	grunt.initConfig({
		output: {
			templates: 'dist/templates',
			js: {
				application: 'dist/mv'
			}
		},

		files: {
			js: {
				application: [
					'assets/js/**/*.js'
				]
			},
			clean: [
        'dist/*',
				'test/*'
			],
			partials: [
				'assets/templates/**',
			],
			test: {
				html: [
					'assets/test-html/**'
				]
			}
		},

		/**
		 * JS compilation
		 * All this does is smush and minify.
		 */
		concat: {
			options: {
				separator: ''
			},
			application_js: {
				src: '<%= files.js.application %>',
				dest: '<%= output.js.application %>.js'
			},
			/*
			bower_js: {
				src: '<%= files.js.bower %>',
				dest: '<%= output.js.bower %>.js'
			}
			*/
		},

		/**
		 * JSHint
		 */
		jshint: {
			options: {
				jshintrc: 'assets/js/.jshintrc'
			},
			src: {
				src: '<%= files.js.application %>',
				filter: function(filepath) {
					// When the file was modified
					var filemod = (require('fs').statSync(filepath)).mtime;

					// One day ago
					var dayago = (new Date()).setDate((new Date()).getDate() - 1);

					// If the file was modified in the last day, give to the task
					// otherwise filter it out
					//return true;
					return (filemod > dayago);
				},
			},
		},

		/**
		 * JS Minimizer
		 */
		uglify: {
			options: {
				preserveComments: 'some'
			},
			application_js: {
				src: '<%= concat.application_js.dest %>',
				dest: '<%= output.js.application %>.min.js'
			},
		},

		/**
		 * Clean the project
		 */
		clean: {
			dist: '<%= files.clean %>'
		},

		/**
		 * File Copies
		 */
		copy: {
			partials: {
				expand: true,
				flatten: false,
				cwd: 'assets/templates',
				src: '**',
				dest: 'dist/templates'
			},
			
			test_bootstrap: {
				expand: true,
				flatten: false,
				cwd: 'bower_components/bootstrap/dist',
				src: '**',
				dest: 'test'
			},
			test_js: {
				flatten: true,
				expand: true,
				src: [
					'bower_components/angular/angular.js',
					'bower_components/angular-bootstrap/ui-bootstrap-tpls.min.js',
					'bower_components/jquery/dist/jquery.min.js',
					'bower_components/jquery/dist/jquery.min.map'
				],
				dest: 'test/js/'
			},
			test_mv_js: {
				flatten: true,
				expand: true,
				src: [
					'dist/mv.js',
				],
				dest: 'test/js/'
			},
			test_mv_templates: {
				expand: true,
				flatten: false,
				cwd: 'dist/templates',
				src: '**',
				dest: 'test/templates'
			},
			test_html: {
				expand: true,
				flatten: false,
				cwd: 'assets/test-html',
				src: '**',
				dest: 'test'
			}
		},

		/**
		 * Watch
		 * Watch the filesystem and auto-run these commands
		 * This wont pick up "new" files.
		 */
		watch: {
			options: {
				livereload: false,
				debounceDelay: 100,
				spawn: false
			},
			js: {
				files: '<%= files.js.application %>',
				tasks: ['jshint', 'concat:application_js', 'uglify:application_js', 'copy:test_mv_js']
			},
			partials: {
				files: '<%= files.partials %>',
				tasks: ['copy:partials', 'copy:test_mv_templates' ]
			},
			test: {
				files: '<%= files.test.html %>',
				tasks: ['copy:test_html' ]
			}
		}
	});

	/**
	 * Plugins
	 * We load the necessary Grunt plugins that
	 * help us run our compilation. You will also
	 * need to reference this in package.json
	 */
	require("matchdep").filterDev([
		"grunt-*",
		"!grunt-template-jasmine-requirejs"
	]).forEach(grunt.loadNpmTasks);

	/*
	 * Tasks
	 */
	// Full distribution task.
	grunt.registerTask('dist-js', ['jshint', 'concat', 'uglify']);
  grunt.registerTask('dist', ['clean', 'dist-js', 'copy:partials' ]);
  grunt.registerTask('build-test', ['dist', 'copy:test_bootstrap', 'copy:test_js', 'copy:test_mv_js', 'copy:test_mv_templates', 'copy:test_html' ]);

	//  grunt.registerTask('default', ['jshint', 'concat', 'gen-css', 'copy:html', 'copy:partials', 'watch']);
	grunt.registerTask('default', ['dist', 'build-test', 'watch']);
};
