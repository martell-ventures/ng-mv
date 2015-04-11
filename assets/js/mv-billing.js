/*
*
* mv.billing
*
* For card processing:
*  set credit-card-number on the card number field, optional binding to card-type
*  set credit-card-cvv on the cvv field, bind card-number="" to the card number model
*
* 
*
*/
(function() {
	var module = angular.module('mv.billing', ['mv.configuration']);

	module.factory('creditCards', [function() {
		var cardInfo= [
			{
				type: 'discover',
				pattern: /^(6011|65|64[4-9]|622)/,
				length: [16],
				cvcLength: [3],
				luhn: true
			}, {
				type: 'mastercard',
				pattern: /^5[1-5]/,
				length: [16],
				cvcLength: [3],
				luhn: true
			}, {
				type: 'amex',
				pattern: /^3[47]/,
				length: [15],
				cvcLength: [3, 4],
				luhn: true
			}, 
			{
				type: 'visa',
				pattern: /^4/,
				length: [13, 14, 15, 16],
				cvcLength: [3],
				luhn: true
			}
		];
		
		function validLuhn(num) {
			var odd = true;
			var sum = 0;
			var digits = (num + '').split('').reverse();

			for (var ii = 0; ii < digits.length; ii++) 
			{
				var digit = parseInt(digits[ii], 10);
				if ((odd = !odd)) {
					digit *= 2;
				}

				if (digit > 9) {
					digit -= 9;
				}

				sum += digit;
			}

			return (sum % 10 === 0);
		}
		
		return {
			fromNumber: function(num){
				var ii;

				num = (num + '').replace(/\D/g, '');
				for (ii = 0; ii < cardInfo.length; ii++) {
					var card = cardInfo[ii];
					if (card.pattern.test(num)) {
						return card;
					}
				}
				return null;
			},
	
			fromType: function(type) {
				var ii;
				for (ii = 0; ii < cardInfo.length; ii++) {
					var card = cardInfo[ii];
					if (card.type === type) {
						return card;
					}
				}
			},

			numberValidForCard: function(card, num) {
				var digitsOnly = (num + '').replace(/\D/g, '');
				var valid= false;
			
				if(card.length.indexOf(digitsOnly.length)>=0)
				{
					// length valid..
					if(card.luhn)
					{
						valid= validLuhn(digitsOnly);
					} else {
						valid= true;
					}
				}
			
				return valid;
			},
			
			cvcValidForCard: function(card, num) {
				var digitsOnly = (num + '').replace(/\D/g, '');
				var valid= false;
			
				if(card.cvcLength.indexOf(digitsOnly.length)>=0)
				{
					valid= true;
				}
			
				return valid;
			}
		};
	}]);

	// not sure if this is a good one.
	module.directive('creditCardCvv', ['creditCards', function(creditCards) {
		return {
			restrict: 'A',
			require: '?ngModel',
			scope: {
				cardNumber: '=creditCardCvv',
			},
			link: function($scope, $element, $attrs, ngModel) {
				if (!ngModel) {
					return; // do nothing if no ng-model
				}
				// only valid is digits
				ngModel.$parsers.unshift(function (inputValue)
				{
					if (inputValue) {
						var digits = inputValue.replace(/[^0-9]/g, '');
						if (digits !== inputValue) {
							ngModel.$setViewValue(digits);
							ngModel.$render();
						}
						return digits;
					}
					return undefined;
				});

				ngModel.$validators.invalidSecurityCode = function(modelValue, viewValue) {
					var card= creditCards.fromNumber($scope.cardNumber);
					if(!card || !creditCards.cvcValidForCard(card, viewValue))
					{
						return false;
					} else {
						return true;
					}
				};

				$scope.$watch('cardNumber', function() {
					var card= creditCards.fromNumber($scope.cardNumber);

					// this mightshould be in the parser; we could make sure it's the right length
					if(card)
					{
						$element.attr('minLength', card.cvcLength[0]);
						$element.attr('maxLength', (card.cvcLength.length==2) ? card.cvcLength[1] : card.cvcLength[0]);
					} else {
						$element.attr('minLength', 3);
						$element.attr('maxLength', 4);
					}
					
					ngModel.$validate();
				});
			}
		};
	}]);

	// so i don't think it's considered good form to eat non-numbers.  Intsead, we'll validate luhn.
	module.directive('creditCardNumber', ['creditCards', function(creditCards) {
		return {
			restrict: 'A', // only activate on element attribute
			require: '?ngModel', // get a hold of NgModelController
			scope: {
				cardType: '=?'
			},
			link: function($scope, $element, $attrs, ngModel) {
				if (!ngModel) {
					return; // do nothing if no ng-model
				}

				// only valid is digits and space bar.
				ngModel.$parsers.unshift(function (inputValue)
				{
					if (inputValue) {
						var digits = inputValue.replace(/[^0-9 ]/g, '');
						if (digits !== inputValue) {
							ngModel.$setViewValue(digits);
							ngModel.$render();
						}
						return digits;
					}
					return undefined;
				});

				ngModel.$validators.invalidCardNumber = function(modelValue, viewValue) {
					var value = modelValue || viewValue;
					var valid = true;

					// because we might not have this valid (because it could be invisible)
					if($element.prop('required'))
					{
						valid = false;
						// if digits only...
						var card= creditCards.fromNumber(value);
						if(card)
						{
							$scope.cardType= card.type;

							var valueWithoutSpaces= value.replace(/ /g, '');
							var numberOfSpaces= value.length - valueWithoutSpaces.length;

							$element.attr('minLength', card.length[0] + numberOfSpaces);
							$element.attr('maxLength', card.length[card.length.length-1] + numberOfSpaces);

							// window.console.log("Card Type: "+card.type);
							if(creditCards.numberValidForCard(card, value))
							{
								// window.console.log("Number valid for Type: "+card.type+ " value:"+value);
								valid= true;
							}
						} else {
							$scope.cardType= undefined;
							$element.attr('minLength', 13);
							$element.attr('maxLength', 16);
						}
					}
					
					return valid;
				};
			}
		};
	}]);

	module.directive('creditCardExpirationMonth', function() {
		return {
			restrict: 'A',
			require: '?ngModel',
			scope: {
				expirationYear: '='
			},
			link: function(scope, element, attrs, ngModel) {
				if (!ngModel) {
					return; // do nothing if no ng-model
				}

				scope.$watch('expirationYear', function() {
					ngModel.$setValidity('expirationMonth', scope.validMonth(ngModel.$viewValue));
				});

				ngModel.$validators.expirationMonth = function(modelValue, viewValue) {
					var value = modelValue || viewValue;
					return scope.validMonth(value);
				};

				scope.validMonth= function(value)
				{
					var valid= true;
					if(scope.expirationYear)
					{
						var expirationYear= parseInt(scope.expirationYear);
						// check it..
						var dt= new Date();
						var expMonth= parseInt(value) - 1; //dt.getMonth() is 0-11
						if(expirationYear==dt.getFullYear() && expMonth<= dt.getMonth())
						{
							// month is valid.
							valid= false;
						}
					}
					
					return valid;
				};
			}
		};
	});

	module.directive('creditCardExpirationYear', function() {
		return {
			restrict: 'A',
			require: '?ngModel',
			link: function(scope, element, attrs, ngModel) {
				if (!ngModel) {
					return; // do nothing if no ng-model
				}

				ngModel.$validators.expirationYear = function(modelValue, viewValue) {
					var value = modelValue || viewValue;
					var dt= new Date();
					var expirationYear= parseInt(value);
					
					return ((expirationYear < dt.getFullYear()) ? false : true);
				};
			}
		};
	});
  
  module.directive('creditCardInformation', ['$mvConfiguration', 'creditCards', function($mvConfiguration, creditCards) {
		return {
			restrict: 'E',
			templateUrl: function($element, $attrs) {
				var result= '';
				if($attrs.templateUrl !== undefined)
				{
					result= $attrs.templateUrl;
				} else {
					result= $mvConfiguration.templateBasePath + 'credit-card-information.html';
				}

				return result;
			},
			scope: {
				cardholderName: "=",
				cardNumber: "=",
				cardType: "=?",
				expirationMonth: "=",
				expirationYear: "=",
				securityCode: "=",
				saveCard: "=?",
			},
      link: function($scope, $element, $attrs) {
				$scope.state= {
					years: [],
					months: [],
					allowCardSave: $scope.saveCard===undefined ? false : true
				};

				var dt= new Date();
				for(var ii= 0; ii<10; ii++)
				{
					var year= dt.getFullYear()+ii;
					$scope.state.years.push({ label: year, value: year});
				}
				
				$scope.state.months= [
					{ label: '1 - January', value: 1 },
					{ label: '2 - February', value: 2 },
					{ label: '3 - March', value: 3 },
					{ label: '4 - April', value: 4 },
					{ label: '5 - May', value: 5 },
					{ label: '6 - June', value: 6 },
					{ label: '7 - July', value: 7 },
					{ label: '8 - August', value: 8 },
					{ label: '9 - September', value: 9 },
					{ label: '10 - October', value: 10 },
					{ label: '11 - November', value: 11 },
					{ label: '12 - December', value: 12 },
				];
        
      }
    };
  }]);
})();
