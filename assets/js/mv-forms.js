(function() {
  // NOTE:
	// Post testing.
  // you must define:
  // myApp.constant('mvTemplateBasePath', 'Greasy Giant');
	var app = angular.module('mv.forms', ['mv.configuration', 'mv.widgets']);

	// Country loader (so can use in multiple places)
	// FIXME: Embed countries?
	app.service('mvCountryLoader', ['$http', '$q', '$mvConfiguration', function($http, $q, $mvConfiguration ) {
		var countryLoadDeferred = $q.defer();
	
		var getResult = $http.get($mvConfiguration.templateBasePath+'countries.json');
		if(getResult.success !== undefined)
		{
			getResult.success(function(data) {
				countryLoadDeferred.resolve(data);
			});
		
			getResult.error(function(failureData) {
				countryLoadDeferred.reject(failureData);
			});
		} else {
			// modern versions of angular unify this with then.
			getResult.then(function(data) {
				countryLoadDeferred.resolve(data);
			}, function(failureData) {
				countryLoadDeferred.reject(failureData);
			});
		}
		
		return countryLoadDeferred.promise;
	}]);

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
	app.directive('mvAddress', ['$mvConfiguration', '$q', '$http', 'mvCountryLoader', function($mvConfiguration, $q, $http, mvCountryLoader) {
		// by putting this out here, it only gets loaded once.
//		var countryLoadDeferred;

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
/*		
		function loadCountriesFromServer() 
		{
			if(countryLoadDeferred===undefined)
			{
				countryLoadDeferred = $q.defer();
				
				var getResult = $http.get($mvConfiguration.templateBasePath+'countries.json');
				if(getResult.success !== undefined)
				{
					getResult.success(function(data) {
						countryLoadDeferred.resolve(data);
					});
					
					getResult.error(function(failureData) {
						countryLoadDeferred.reject(failureData);
					});
				} else {
					// modern versions of angular unify this with then.
					getResult.then(function(data) {
						countryLoadDeferred.resolve(data);
					}, function(failureData) {
						countryLoadDeferred.reject(failureData);
					});
				}
			}
			
			return countryLoadDeferred.promise;
		}
*/

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
				fieldChanged: '&?', // optional, takes field, 
				filterCountries: '&?', // optional, returns true if country is acceptable.
				// fieldChanged: '&?' // optional fieldChanged
				// filterCountries: method name- calls with country, returns true or false if the country should be used.
			},
			link: function($scope, $element, $attrs) {
				var lastSelectedState= {};
				$scope.countries= [];
				$scope.disabled= false;

				// allow for disabling of the mvAddress, for effectively "locking" it.
				if($attrs.ngDisabled !== undefined)
				{
					$scope.$parent.$watch($attrs.ngDisabled, function(newValue) {
						$scope.disabled= newValue;
					});
				}

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

				$scope.sendChange= function(fieldName, newValue, oldValue) {
					if($scope.fieldChanged) {
						$scope.fieldChanged({ 
							field: $attrs[fieldName], // passed back up as the binding name.
							newValue: newValue,
							oldValue: oldValue
						});
					}
				};
				
				function syncStateOnCountryChange() {
					// restore the state.
					if(lastSelectedState[$scope.country])
					{
						$scope.state= lastSelectedState[$scope.country];
					} else {
						if($scope.countryObject !== undefined && $scope.countryObject.States)
						{
							var selected= MatchToNameOrAbbreviation($scope.state, $scope.countryObject.States);
							if(selected)
							{
								$scope.state= selected.Abbreviation;
							}
						} else {
							$scope.state= '';
						}
					}
				}
				
				function syncCountryObjectToCountryCode(countryCode) {
					// we don't check this, because we do this from both sides.
					if($scope.countryObject===undefined || countryCode != $scope.countryObject.Code)
					{
						var changed= false;
						angular.forEach($scope.countries, function(item) {
							if(item.Code==countryCode)
							{
								// window.console.log("Change the country object to "+item.Code);
								$scope.countryObject= item;
								changed= true;
							}
						});
					
						if(!changed) {
							window.console.log("Change the country object; country "+countryCode+" NOT FOUND!");
						}
					}
				}
				
				// this is for the case where you change the model value directly.
				$scope.$watch('country', function(newValue) {
					if(newValue !== undefined)
					{
						// window.console.log("Changing country to "+newValue);
						syncCountryObjectToCountryCode(newValue);
					}
				});

				// if you change the select, it changes the countryObject, so here we make sure country stays in sync.
				$scope.$watch('countryObject.Code', function(newValue) {
					if(newValue !== undefined && newValue != $scope.country)
					{
						// window.console.log("Changing country object to "+newValue);
						$scope.country = newValue;
						syncStateOnCountryChange();
					}
				});
				
				$scope.$watch('state', function(newValue, oldValue) {
					if(newValue !== oldValue) {
						lastSelectedState[$scope.country]= newValue;
					}
				});

				$scope.stateRequired= function() {
					var req= false;
					
					if($scope.countryObject !== undefined)
					{
						// if we have a state array on the object, we require it.
						if($scope.countryObject.States && $scope.countryObject.States.length>0)
						{
							req = $scope.requiredFields && $scope.requiredFields['state'];
						} else {
							req = false; 
						}
					}
					
					return req;
				};

				// load the countries
				function loadCountries() 
				{
					mvCountryLoader.then(function(data) {
//					loadCountriesFromServer().then(function(data) {
						// allow us to filter countries
						if($attrs.filterCountries)
						{
							var filtered= [];
							angular.forEach(data, function(country) {
								if($scope.filterCountries({ country: country }))
								{
									filtered.push(country);
								}
							});
							$scope.countries= filtered;
						} else {
							$scope.countries= data;
						}
					
						var countryFound= false, hasUS= false;
						angular.forEach($scope.countries, function(country) {
							if(country.Code=='US')
							{
								hasUS= true;
							}
							// if country is undefined, this will NOT be found.
							if($scope.country==country.Code)
							{
								countryFound= true;
							}
						});
					
						// set a sane default.
						if(!countryFound) // not found, or was set to undefined.
						{
							if($attrs.defaultCountryCode)
							{
								$scope.country= $attrs.defaultCountryCode;
							} else {
								if(hasUS)
								{
									$scope.country= 'US';
								} else {
									// filtered; take whatever is first (allow default later?)
									$scope.country= $scope.countries[0].Code;
								}
							}
						} else {
							// setting the country code above would be a change, and would reset it.
							// this handles the case where we found it; we would have to change country code away and back othewise.
							syncCountryObjectToCountryCode($scope.country);
						}
					});
				}

				// initial load
				loadCountries();
			
				// mainly for testing country filtering.
				$scope.$on('mv-reload-countries', function() {
					loadCountries();
				});
			}
		};
	}]);
})();
