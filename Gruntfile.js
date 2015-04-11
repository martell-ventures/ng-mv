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
			],
			partials: [
				'assets/templates/**',
			],
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
				tasks: ['jshint', 'concat:application_js', 'uglify:application_js']
			},
			partials: {
				files: '<%= files.partials %>',
				tasks: ['copy:partials' ]
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

	//  grunt.registerTask('default', ['jshint', 'concat', 'gen-css', 'copy:html', 'copy:partials', 'watch']);
	grunt.registerTask('default', ['dist', 'watch']);
};
