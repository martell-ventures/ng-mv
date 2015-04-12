(function() {
  // NOTE:
	// Post testing.
  // you must define:
  // myApp.constant('mvTemplateBasePath', 'Greasy Giant');
	var app = angular.module('mv.forms', ['mv.configuration']);

	app.directive('postalCode', function() {
		return {
			require: '?ngModel',
			restrict: 'A',
			scope: {
				countryCode: '=postalCode',
			},
			link: function($scope, $element, $attrs, ngModel) {
				if(!ngModel) {
					return;
				}

				// only valid is digits and space bar.
				function parseUSZip(inputValue)
				{
					if (inputValue) {
						var digits = inputValue.replace(/[^0-9 \-]/g, '');
						if (digits !== inputValue) {
							ngModel.$setViewValue(digits);
							ngModel.$render();
						}
						return digits;
					}
					return undefined;
				}
				
				function validUSZip(modelValue, viewValue) 
				{
					var value = modelValue || viewValue;
					var valid;

					// because we might not have this valid (because it could be invisible)
					if($element.prop('required'))
					{
						// if digits only...
						var digitsOnly = value.replace(/[^0-9]/g, '');
						if(digitsOnly.length==9 || digitsOnly.length==5)
						{
							valid= true;
						} else {
							valid= false;
						}
					} else {
						valid= true;
					}
					
					return valid;
				}

				$scope.$watch('countryCode', function(newCode, oldCode) {
					window.console.log("Country changed!");
					if(newCode=='US')
					{
						ngModel.$parsers.unshift(parseUSZip);
						if($element.prop('placeholder'))
						{
							$element.prop('placeholder', 'Zip');
						}
						ngModel.$validators.invalidUSZip = validUSZip;
					} 
					else if(newCode !== undefined)
					{
						if($element.prop('placeholder'))
						{
							$element.prop('placeholder', 'Postal Code');
						}

						// remove the us zip validator
						delete ngModel.$validators.invalidUSZip; // this syntax seems so wrong to me.

						// remove the us zip parser
						var indexToRemove= -1;
						angular.forEach(ngModel.$parsers, function(item, index) {
							if(item===parseUSZip) {
								indexToRemove= index;
							}
						});
						
						if(indexToRemove>=0) {
							ngModel.$parsers.splice(indexToRemove, 1);
						}
					}
					
					// reflect any changes made
					ngModel.$validate();
				});
				
				$scope.$watch(function() {
					return $element.attr('required');
				}, function(newValue) {
					debugger;
					ngModel.$validate();
				});
			}
		};
	});

	// NOTE: this is definitely different than before.
	// update addressItem through a mapping table, ideally.
	app.directive('mvAddress', ['$http', '$mvConfiguration', function($http, $mvConfiguration) {
		return {
			restrict: 'E',
			templateUrl: function(tElement, tAttrs) {
				var result= '';
				if(tAttrs['templateUrl'] !== undefined)
				{
					result= tAttrs['templateUrl'];
				} else {
					result= $mvConfiguration.templateBasePath + 'address-elements.html';
				}

				return result;
			},
			scope: {
				street: "=",
				street2: "=?", //optional, also set useStreet2 to true
				city: "=",
				state: "=",
				zip: "=",
				country: "=", // country code now ISO, not country record.
				requiredFields: "=",
				useStreet2: "=?", //optional, set to true if you want to use street address line 2 field
			},
			link: function($scope, $element, $attrs) {
				$scope.countryObject= {};
				$scope.countries = [];

				// fill in sane values; note that the country is set below.
				if (!$scope.street) {
					$scope.street = '';
				}
				if ($scope.useStreet2) {
					if (!$scope.street2) {
						$scope.street2 = '';
					}
				}
				if (!$scope.city) {
					$scope.city = '';
				}
				if (!$scope.state) {
					$scope.state = '';
				}
				if (!$scope.zip) {
					$scope.zip = '';
				}

				// change country; make sure state updates appropriately
				$scope.$watch('countryObject', function(newValue) {
					if(newValue != $scope.country)
					{
						$scope.country= newValue.Code;

						// return to the previous value (if there was one.)
						if(lastSelectedState[$scope.country])
						{
							$scope.state= lastSelectedState[$scope.country];
						} else {
							$scope.state= '';
						}
					}
				});
				
				var lastSelectedState= {};
				$scope.$watch('state', function(newValue, oldValue) {
					if(newValue !== oldValue) {
						lastSelectedState[$scope.country]= newValue;
					}
				});

				function MatchToNameOrAbbreviation(test, arr) {
					var selected = null;
					if(test !== undefined)
					{
						var lowerMatch = test.trim().toLowerCase();
						angular.forEach(arr, function(item) {
							if(lowerMatch==item.Abbreviation.toLowerCase() || lowerMatch==item.Name.toLowerCase())
							{
								selected= item;
							}
						});
					}
					return selected;
				}

				// load the countries
				$http.get($mvConfiguration.templateBasePath+'countries.json').success(function(data) {
					$scope.countries= data;
					if($scope.country===undefined)
					{
						$scope.country= 'US';
					}
					
					// now find the original one and update the state and the country object appropriately.
					angular.forEach($scope.countries, function(country) {
						if(country.Code==$scope.country)
						{
							$scope.countryObject= country;
							if(country.States)
							{
								var selected= MatchToNameOrAbbreviation($scope.state, country.States);
								if(selected)
								{
									$scope.state= selected.Abbreviation;
								}
							}
						}
					});
				});
			}
		};
	}]);
})();
