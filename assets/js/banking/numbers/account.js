(function() {
	var module= angular.module('mv.banking.numbers.account', []);

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

	module.factory('bankAccountNumberProvider', ['$q', function($q) {
		function bankAccountNumberProviderForCountryCode(countryCode) {
			var fields;
			
			switch(countryCode) {
			case 'US': // US
				fields = {
					pattern: '(\\d){3,}',
					label: "Account Number",
					maxLength: 34,
					placeholder: "123456789",
					description: "This should be 3 or more digits and is found on the front of your check.",
					digitsOnly: true,
				};
				break;
			case 'GB':
				fields = {
					pattern: '(\\d){8}',
					label: "Account Number",
					maxLength: 8,
					placeholder: "12345678",
					description: "This should be 8 digits.",
					digitsOnly: true
				};
				break;
			default:
				fields = {
					pattern: '(.){3,}',
					label: "Account Number",
					maxLength: 34,
					placeholder: "12345678",
					description: "This should be 3 or more letters or digits.",
					digitsOnly: false
				};
				break;
			}
			
			return fields;
		}
		
		return {
			forCountryCode: bankAccountNumberProviderForCountryCode
		};
	}]);

	module.directive('bankAccountNumberLabel', ['bankAccountNumberProvider', function(bankAccountNumberProvider) {
		return {
			restrict: 'E',
			scope: {
				countryCode: '='
			},
			replace: true,
			template: "<span>{{ data.label }}</span>",
			link: function($scope, $element, $attr) {
				$scope.data = {
					label: 'Account Number'
				};

				$scope.$watch('countryCode', function(newValue) {
					if(newValue) {
						var d = bankAccountNumberProvider.forCountryCode(newValue);
						$scope.data.label = d.label;
					}
				});
			}
		};
	}]);

	module.directive('bankAccountNumberForCountry', ['bankAccountNumberProvider', function(bankAccountNumberProvider) {
		return {
			restrict: 'A',
			require: 'ngModel',
			link: function($scope, $element, $attr, ngModel) {
				var validationData = null;

				if(!$attr.bankAccountNumberForCountry) {
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

				ngModel.$validators.bankAccountNumberForCountry= function(modelValue, viewValue) {
					if(!validationData)
					{
						return false;
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

				$scope.$watch($attr.bankAccountNumberForCountry, function(newValue) {
					if(newValue) {
						validationData = bankAccountNumberProvider.forCountryCode(newValue);
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

	module.directive('bankAccountNumberHelpBlockText', ['bankAccountNumberProvider', function(bankAccountNumberProvider) {
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
						var data = bankAccountNumberProvider.forCountryCode(newValue);
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
