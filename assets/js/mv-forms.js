(function() {
  // NOTE:
	// Post testing.
  // you must define:
  // myApp.constant('mvTemplateBasePath', 'Greasy Giant');
	var app = angular.module('mv.forms', ['mv.configuration', 'mv.widgets']);

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
					if($scope.countryCode=='US')
					{
						if (inputValue) 
						{
							var digits = inputValue.replace(/[^0-9 \-]/g, '');
							if (digits !== inputValue) {
								ngModel.$setViewValue(digits);
								ngModel.$render();
							}
							return digits;
						}
						return undefined;
					} else {
						return inputValue;
					}
				}
				
				function validUSZip(modelValue, viewValue) 
				{
					var value = modelValue || viewValue;
					var valid= false;
					
					// if digits only...
					if($scope.countryCode=='US')
					{
						var digitsOnly = value ? value.replace(/[^0-9]/g, '') : '';
						if(digitsOnly.length==9 || digitsOnly.length==5)
						{
							valid= true;
						} else {
							valid= false;
						}
					} else {
						valid= true;
					}
					
					if(!$element.prop('required'))
					{
						valid= true;
					}
					
					return valid;
				}
				
				// add our validator..
				ngModel.$validators.validUSZip= validUSZip;
				ngModel.$parsers.unshift(parseUSZip);

				$scope.$watch('countryCode', function(newCode, oldCode) {
					if(newCode=='US')
					{
						if($element.prop('placeholder'))
						{
							$element.prop('placeholder', 'Zip');
						}
					} 
					else if(newCode !== undefined)
					{
						if($element.prop('placeholder'))
						{
							$element.prop('placeholder', 'Postal Code');
						}
					}
					
					// reflect any changes made
					ngModel.$validate();
				});
				
				$scope.$watch(function() {
					return $element.prop('required');
				}, function(newValue) {
					ngModel.$validate();
				});
			}
		};
	});

	// NOTE: this is definitely different than before.
	// update addressItem through a mapping table, ideally.
	app.directive('mvAddress', ['$http', '$mvConfiguration', '$parse', function($http, $mvConfiguration, $parse) {
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
				fieldChanged: '&?' // optional, takes field, 
				// fieldChanged: '&?' // optional fieldChanged
			},
			link: function($scope, $element, $attrs) {
				var lastSelectedState= {};
				$scope.countries= [];

					// fill in sane values; note that the country is set below.
				// FIXME: I'd like to remove this, but unsure if I can safely based on other places that might expect these to have fields.
				if (!$scope.street) {
					$scope.street = '';
				}
				if ($scope.useStreet2 && !$scope.street2) {
					$scope.street2 = '';
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

				// store this, so when we setup the country value, we restore if one was set on initial.
				if($scope.state && $scope.country)
				{
					lastSelectedState[$scope.country]= $scope.state;
				}

				// change country; make sure state updates appropriately
				$scope.$watch('countryObject', function(newValue) {
					if(newValue && newValue.Code != $scope.country)
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
				
				$scope.sendChange= function(fieldName, newValue, oldValue) {
					if($scope.fieldChanged) {
						$scope.fieldChanged({ 
							field: $attrs[fieldName], // passed back up as the binding name.
							newValue: newValue,
							oldValue: oldValue
						});
					}
/*
					if(onChangedField)
					{
						onChangedField($scope, { 
							field: fieldName,
							newValue: newValue,
							oldValue: oldValue
						});
					}
*/
				};
				
				// this is for the case where you change the model value directly.
				$scope.$watch('country', function(newValue) {
					if($scope.countryObject && newValue != $scope.countryObject.Code)
					{
						var changed= false;
						angular.forEach($scope.countries, function(item) {
							if(item.Code==newValue)
							{
								window.console.log("Change the country object!");
								$scope.countryObject= item;
								changed= true;
							}
						});
						
						if(!changed) {
							window.console.log("Change the country object; country "+newValue+" NOT FOUND!");
						}
					}
				});
				
				$scope.$watch('state', function(newValue, oldValue) {
					if(newValue !== oldValue) {
						lastSelectedState[$scope.country]= newValue;
					}
				});

				$scope.stateRequired= function() {
					var req;
					
					if($scope.country=='US' || $scope.country=='CA')
					{
						req= $scope.requiredFields && $scope.requiredFields['state'];
					} else {
						// we don't know if these have states or regions, so don't require it.
						req= false;
					}
						
					return req;
				};

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
