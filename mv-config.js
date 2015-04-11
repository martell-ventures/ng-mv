(function() {
	var module = angular.module('mv.configuration', []);

  module.provider('$mvConfiguration', function() {
    var $mvConfigurationProvider= {
      options: {
        templateBasePath: 'defaultTemplatePath',
      },
      setTemplateBasePath: function(t) {
        this.options.templateBasePath= t;
      },
      $get: ['$injector', function($injector) {
        var config= {
          templateBasePath: this.options.templateBasePath
        };
        
        return config;
      }]
    };
    
    return $mvConfigurationProvider;
  });
}());
