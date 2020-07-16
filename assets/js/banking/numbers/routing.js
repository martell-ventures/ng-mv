(function() {
	var module= angular.module('mv.banking.numbers.routing', []);

	// this is
	function addOrRemoveParser(model, parser, needsParser) {
		var existingPosition = model.$parsers.indexOf(parser);
		var changed = false;
		if(needsParser && existingPosition<0)
		{
			// add it..
			model.$parsers.unshift(parser);
			changed = true;
		} else if(!needsParser && existingPosition>=0) {
			// remove it
			model.$parsers.splice(existingPosition, 1);
			changed = true;
		}

		if(changed) {
			model.$validate();
		}
	}
	
	module.factory('bankRoutingProvider', ['$q', function($q) {
		function bankRoutingInfoForCountryCode(countryCode) {
			var fields;
			
			switch(countryCode) {
			case 'US': // US
				fields = {
					pattern: "\\d{9}",
					label: "Routing Number",
					maxLength: 9,
					placeholder: "123456789",
					description: "This should be 9 digits and is found on the front of your check.",
					digitsOnly: true
				};
				break;
			case 'CA': // Canada
				fields = {
					pattern: "0\\d{8}",
					label: "Routing Number",
					maxLength: 9,
					placeholder: "012345678",
					description: "This should be 9 digits starting with a 0.",
					digitsOnly: true
				};
				break;
			case 'AU': // Australia
				fields = { 
					pattern: "\\d{6}",
					label: "BSB",
					maxLength: 6,
					placeholder: "123456",
					description: "This should be 6 digits.",
					digitsOnly: true
				};
				break;
			case 'GB': // Great Britain
				fields = { 
					pattern: "\\d{6}",
					label: "Routing Number",
					maxLength: 6,
					placeholder: "123456",
					description: "This should be 6 digits.",
					digitsOnly: true
				};
				break;
			default:
				fields = {
					pattern: ".{3,}",
					label: "Bank identifier, routing number, sort code, Swift, or BSB",
					maxLength: 35,
					description: "This should be your bank's routing, Swift, sort code or BSB code",
					placeholder: "",
					digitsOnly: false
				};
				break;
			}
			
			return fields;
		}
		
		return {
			forCountryCode: bankRoutingInfoForCountryCode
		};
	}]);

	module.directive('bankRoutingLabel', ['bankRoutingProvider', function(bankRoutingProvider) {
		return {
			restrict: 'E',
			scope: {
				countryCode: '='
			},
			replace: true,
			template: "<span>{{ data.label }}</span>",
			link: function($scope, $element, $attr) {
				$scope.data = {
					label: 'Bank identifier, routing number, sort code, or BSB'
				};

				$scope.$watch('countryCode', function(newValue) {
					if(newValue) {
						var d = bankRoutingProvider.forCountryCode(newValue);
						$scope.data.label = d.label;
					}
				});
			}
		};
	}]);

	module.directive('bankRoutingNumberForCountry', ['bankRoutingProvider', function(bankRoutingProvider) {
		return {
			restrict: 'A',
			require: 'ngModel',
			link: function($scope, $element, $attr, ngModel) {
				var validationData = null;

				if(!$attr.bankRoutingNumberForCountry) {
					console.log("Country code required");
					return;
				}

				function onlyDigitsParser(inputValue) {
					if (inputValue) {
						var digits = inputValue.replace(/[^0-9]/g, '');
						if (digits !== inputValue) {
							ngModel.$setViewValue(digits);
							ngModel.$render();
						}
						return digits;
					}
					return undefined;
				}

				ngModel.$validators.bankRoutingNumberForCountry= function(modelValue, viewValue) {
					if(!validationData)
					{
						return true;
					}
					var valid= false;
					var value = viewValue || '';
					if(value.length <= validationData.maxLength)
					{
						if(value.match(validationData.pattern))
						{
							valid = true;
						}
					}
					
					if(!$element.prop('required'))
					{
						valid= true;
					}
					
					return valid;
				};

				$scope.$watch($attr.bankRoutingNumberForCountry, function(newValue) {
					if(newValue) {
						validationData = bankRoutingProvider.forCountryCode(newValue);
						if(validationData) {
							$element.attr('placeholder', validationData.placeholder);
							$element.attr('maxlength', validationData.maxLength);
							$element.attr('pattern', validationData.pattern);

							addOrRemoveParser(ngModel, onlyDigitsParser, validationData.digitsOnly);
							ngModel.$validate();
						}
					}
				});
			}
		};
	}]);

	module.directive('bankRoutingHelpBlockText', ['bankRoutingProvider', function(bankRoutingProvider) {
		return {
			restrict: 'E',
			scope: {
				countryCode: '='
			},
			replace: true,
			template: "<span>{{ data.description }}</span>",
			link: function($scope, $element, $attr) {
				$scope.data = {
					description: ''
				};

				$scope.$watch('countryCode', function(newValue) {
					if(newValue) {
						var data = bankRoutingProvider.forCountryCode(newValue);
						if(data) {
							if(data.description) {
								$scope.data.description = data.description;
							} else {
								$scope.data.description = '';
							}
						}
					}
				});
			}
		};
	}]);
})();
