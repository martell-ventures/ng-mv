(function() {
	var app= angular.module('mv.filters', []);
	
  app.filter('capitalize', function() {
  	return function(input, scope) {
  		if (input!=null)
  		{
  			input = input.toLowerCase();
  		}
			
  		return input.substring(0,1).toUpperCase()+input.substring(1);
  	};
  });

  app.filter('max', function() {
  	return function(input, maximumValue) {
  		input = input || '';
  		var number= parseInt(input);
  		if(number>maximumValue)
  		{
  			number= maximumValue;
  		}
  		return ""+number;
  	};
  });
})();
