(function() {
	var module= angular.module('mv.banking.kyc', [
		'mv.widgets',
		'mv.configuration',
	]);

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

	module.factory('kycPersonalIdProvider', ['$q', function($q) {
		function personalIdFieldsForCountryCode(countryCode, type) {
			var fields;

			switch(countryCode) {
			case 'US': // US
				if(type=='internal')
				{
					fields = {
						pattern: "\\d{9}", // 8n,16c
						label: "Social Security Number (9 Digits)",
						maxLength: 9,
						placeholder: "123-45-6789",
						digitsOnly: true
					};
				} else {
					fields = {
						pattern: "\\d{4}", // 8n,16c
						label: "Social Security Number (Last 4 Digits)",
						maxLength: 4,
						placeholder: "1234",
						digitsOnly: true
					};
				}
				break;
			case 'MY': // Malaysia
				fields = {
					pattern: ".*",
					label: "Income Tax Number (ITN)",
					maxLength: 20,
					placeholder: ""
				};
				break;
			case 'NZ': // New Zealand
				fields = { 
					pattern: ".*",
					label: "Inland Revenue Department (IRD) Number",
					maxLength: 20,
					placeholder: ""
				};
				break;
			case 'AU': // Australia
				fields = {
					pattern: ".*",
					label: 'Tax File Number (TFN)',
					maxLength: 20,
					placeholder: ""
				};
				break;
			case 'TR': // Turkey
			case 'PS': // Palestine
				fields = {
					pattern: ".*",
					label: 'Tax Identification Number (TIN)',
					maxLength: 20,
					placeholder: ""
				};
				break;
			case 'ID':
				fields = {
					pattern: ".*",
					label: 'Nomor Pokok Wajib Pajak (NPWP)',
					maxLength: 20,
					placeholder: ""
				};
				break;
			case 'SG': // Singapore
				fields = {
					pattern: ".*",
					label: 'UEN',
					maxLength: 20,
					placeholder: ""
				};
				break;
			case 'CA':  // Canada
				fields = {
					pattern: "\\d{9}", // 8n,16c
					label: 'Social Insurance Number (SIN)',
					maxLength: 9,
					placeholder: "123-456-789",
					digitsOnly: true
				};
				break;
			case 'GB': 
				fields = {
					pattern: "[A-Za-z]{2}\\d{6}[A-Za-z0-9]{1}",
					label: 'National Insurance Number (NIN)',
					description: 'This should be a combination of 2 letters, 6 digits, and 1 letter.',
					maxLength: 9,
					placeholder: "AB123456C"
				};
				break;
			default:
				fields = {
					pattern: ".*",
					label: "Personal ID Number",
					maxLength: 	20,
					placeholder: "123456789"
				};
				break;
			}

			if(fields.digitsOnly === undefined) {
				fields.digitsOnly = false;
			}
			
			return fields;
		}
		
		return {
			forCountryCode: personalIdFieldsForCountryCode
		};
	}]);	
	
	module.directive('kycPersonalIdLabel', ['kycPersonalIdProvider', function(kycPersonalIdProvider) {
		return {
			restrict: 'E',
			scope: {
				countryCode: '='
			},
			replace: true,
			template: "<span>{{ data.label }}</span>",
			link: function($scope, $element, $attr) {
				var type = $attr['kycType'] || 'external';

				$scope.data = {
					label: 'Personal ID Number'
				};

				$scope.$watch('countryCode', function(newValue) {
					if(newValue) {
						var d = kycPersonalIdProvider.forCountryCode(newValue, type);
						$scope.data.label = d.label;
					}
				});
			}
		};
	}]);

	module.directive('kycPersonalIdForCountry', ['kycPersonalIdProvider', function(kycPersonalIdProvider) {
		return {
			restrict: 'A',
			require: 'ngModel',
			link: function($scope, $element, $attr, ngModel) {
				var type = $attr['kycType'] || 'external';
				var validationData = null;

				if(!$attr.kycPersonalIdForCountry) {
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

				ngModel.$validators.kycPersonalIdForCountry= function(modelValue, viewValue) {
					if(!validationData) {
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

				$scope.$watch($attr.kycPersonalIdForCountry, function(newValue) {
					if(newValue) {
						validationData = kycPersonalIdProvider.forCountryCode(newValue, type);
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
	
	module.directive('kycPersonalIdHelpBlockText', ['kycPersonalIdProvider', function(kycPersonalIdProvider) {
		return {
			restrict: 'E',
			scope: {
				countryCode: '='
			},
			replace: true,
			template: "<span>{{ data.description }}</span>",
			link: function($scope, $element, $attr) {
				var type = $attr['kycType'] || 'external';
				$scope.data = {
					description: ''
				};

				$scope.$watch('countryCode', function(newValue) {
					if(newValue) {
						var data = kycPersonalIdProvider.forCountryCode(newValue, type);
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
