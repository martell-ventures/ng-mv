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
	var module = angular.module('mv.billing', ['mv.configuration', 'mv.widgets']);

	module.factory('creditCards', [function() {
	  var defaultFormat = /(\d{1,4})/g;

		var cardInfo= [
			{
				type: 'discover',
				pattern: /^(6011|65|64[4-9]|622)/,
				format: defaultFormat,
				length: [16],
				cvcLength: [3],
				luhn: true
			}, {
				type: 'mastercard',
				format: defaultFormat,
				pattern: /^5[1-5]/,
				length: [16],
				cvcLength: [3],
				luhn: true
			}, {
				type: 'amex',
				pattern: /^3[47]/,
				format: /(\d{1,4})(\d{1,6})?(\d{1,5})?/,
				length: [15],
				cvcLength: [4],
				luhn: true
			}, 
			{
				type: 'visa',
				pattern: /^4/,
				format: defaultFormat,
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
			
			formatCardNumber: function(card, num) {
				var groups, upperLength, ref;
				
				if (!card) {
					return num;
				}

				upperLength = card.length[card.length.length - 1];
				num = num.replace(/\D/g, '');
				num = num.slice(0, +upperLength + 1 || 9e9);
      
				if(card.format.global) 
				{
					return (ref = num.match(card.format)) != null ? ref.join(' ') : void 0;
				} 
				else
				{
					groups = card.format.exec(num);

					if (groups != null) {
						groups.shift();

						// have to remove the undefined from the array, or we'll get extra spaces.
						var newGroups= [];
						angular.forEach(groups, function(group) {
							if(group)
							{
								newGroups.push(group);
							}
						});
						groups= newGroups;
					}
					
					return groups != null ? groups.join(' ') : void 0;
				}
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
				
				if($element.prop('id')===undefined || $element.prop('id')==='')
				{
					// make it conform to safari autofill
					$element.prop('id', 'cardCsc');
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
				
				ngModel.$validators.validSecurityCode= function(modelValue, viewValue) {
					var valid= false;
					var card= creditCards.fromNumber($scope.cardNumber);
					if(!card || !creditCards.cvcValidForCard(card, viewValue))
					{
						valid= false;
					} else {
						valid= true;
					}
					
					if(!$element.prop('required'))
					{
						valid= true;
					}
					
					return valid;
				};
				
				// only valid is digits
				ngModel.$parsers.unshift(onlyDigitsParser);

				// if we change required state, remove the invalidSecurity code watcher...
				$scope.$watch(function() {
					return $element.prop('required');
				}, function(newValue) {
					ngModel.$validate();
				});

				$scope.$watch('cardNumber', function() {
					var card= creditCards.fromNumber($scope.cardNumber);

					// this mightshould be in the parser; we could make sure it's the right length
					if(card)
					{
						$element.attr('maxLength', (card.cvcLength.length==2) ? card.cvcLength[1] : card.cvcLength[0]);
					} else {
						$element.attr('maxLength', 4);
					}
					
					ngModel.$validate();
				});
			}
		};
	}]);

	// so i don't think it's considered good form to eat non-numbers.  Intsead, we'll validate luhn.
	module.directive('creditCardNumber', ['creditCards', '$timeout', function(creditCards, $timeout) {
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

				if($element.prop('id')===undefined || $element.prop('id')==='')
				{
					// make it conform to safari autofill
					$element.prop('id', 'cardNumber');
				}
				
				var timeout;
				function setSelectionRange(selectionStart){
					if (typeof selectionStart !== 'number') {
						return;
					}

					// using $timeout:
					// it should run after the DOM has been manipulated by Angular
					// and after the browser renders (which may cause flicker in some cases)
					$timeout.cancel(timeout);
					timeout = $timeout(function(){
						var selectionEnd = selectionStart + 1;
						var input = $element[0];

						if (input.setSelectionRange) {
							input.focus();
							input.setSelectionRange(selectionStart, selectionEnd);
						} else if (input.createTextRange) {
							var range = input.createTextRange();

							range.collapse(true);
							range.moveEnd('character', selectionEnd);
							range.moveStart('character', selectionStart);
							range.select();
						}
					});
				}
				
				function digitsAndSpaceParser(inputValue) {
					if (inputValue) {
						var card= creditCards.fromNumber(inputValue);
						var digits;
						if(card)
						{
							digits= creditCards.formatCardNumber(card, inputValue);
						} else {
							digits = inputValue.replace(/[^0-9 ]/g, '');
						}
						if (digits !== inputValue) {
							ngModel.$setViewValue(digits);
							ngModel.$render();
							
							console.log("Selection Start: "+$element[0].selectionStart+" End: "+$element[0].selectionEnd+" Digits length: "+digits.length);
							if($element[0].selectionStart == $element[0].selectionEnd && $element[0].selectionStart < digits.length) {
								setSelectionRange(digits.length); //Necessary for Android Chrome mobile
							}
						}
						return digits;
					}
					return undefined;
				}

				// valid card number
				ngModel.$validators.validCardNumber= function(modelValue, viewValue) {
					var value = modelValue || viewValue;
					var valid = false;

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

					if(!$element.prop('required'))
					{
						valid= true;
					}
					
					return valid;
				};

				// only valid is digits and space bar.
				ngModel.$parsers.unshift(digitsAndSpaceParser);
				
				// so we can use credit cards on forms that are hidden, we want to be able to turn off validation with required.  That's what this
				// does.
				$scope.$watch(function() { 
					return $element.prop('required');
				}, function(newValue) {
					ngModel.$validate();
				});
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
			link: function($scope, $element, $attrs, ngModel) {
				if (!ngModel) {
					return; // do nothing if no ng-model
				}

				if($element.prop('tagName')=='SELECT')
				{
					var monthNames = ["January", "February", "March", "April", "May", "June",
						"July", "August", "September", "October", "November", "December"
					];
					for(var ii= 0; ii<monthNames.length; ii++)
					{
						var monthNumber= ii+1;
						var option= angular.element('<option value="'+monthNumber+'">'+monthNumber+' - '+monthNames[ii]+'</option>');
						$element.append(option);
					}
				}

				if($element.prop('id')===undefined || $element.prop('id')==='')
				{
					// make it conform to safari autofill
					$element.prop('id', 'cardExpirationMonth');
				}

				ngModel.$validators.validExpirationMonth= function(modelValue, viewValue)
				{
					var value = modelValue || viewValue;
					var valid= true;
					
					if($scope.expirationYear)
					{
						var expirationYear= parseInt($scope.expirationYear);
						// check it..
						var dt= new Date();
						var expMonth= parseInt(value) - 1; //dt.getMonth() is 0-11
						if(expirationYear==dt.getFullYear() && expMonth<= dt.getMonth())
						{
							// month is valid.
							valid= false;
						}
					}
					
					if(!$element.prop('required'))
					{
						valid= true;
					}

					return valid;
				};
				
				$scope.$watch('expirationYear', function() {
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

	module.directive('creditCardExpirationYear', function() {
		return {
			restrict: 'A',
			require: '?ngModel',
			link: function($scope, $element, $attrs, ngModel) {
				if (!ngModel) {
					return; // do nothing if no ng-model
				}
				
				if($element.prop('tagName')=='SELECT')
				{
					var dt= new Date();
					for(var ii= 0; ii<10; ii++)
					{
						var year= dt.getFullYear()+ii;
						var option= angular.element('<option value="'+year+'">'+year+'</option>');
						$element.append(option);
					}
				}
				
				if($element.prop('id')===undefined || $element.prop('id')==='')
				{
					// make it conform to safari autofill
					$element.prop('id', 'cardExpirationYear');
				}

				ngModel.$validators.validExpirationYear= function(modelValue, viewValue) {
					var value = modelValue || viewValue;
					var dt= new Date();
					var expirationYear= parseInt(value);

					var valid= ((expirationYear < dt.getFullYear()) ? false : true);
					if(!$element.prop('required'))
					{
						valid= true;
					}
					
					return valid;
				};
				
				// ngModel.$formatters.unshift(function () {
				// 	debugger;
				// 	return ngModel.$modelValue;
				// });

				$scope.$watch(function() {
					return $element.prop('required');
				}, function(newValue) {
					ngModel.$validate();
				});
			}
		};
	});
	
	module.directive('autofillExpirationFields', function() {
		var quasiInvisibleStyle = "width: 1px; height: 1px; margin-left: -1000px; position: fixed; display: block;";
		return {
			restrict: 'E',
			scope: {},
			template: '<input style="'+quasiInvisibleStyle+'" ng-model="afmonth" id="cardExpirationMonth" maxlength="2" ng-change="update()" type="text"><input style="'+quasiInvisibleStyle+'" id="cardExpirationYear" ng-model="afyear" maxlength="4" ng-change="update()" type="text">',
			link: function($scope, $element, $attr) {
				$scope.update= function() {
					$scope.$parent.$emit('autofill-date', { year: $scope.afyear || '', month: $scope.afmonth || ''});
				};
			}
		};
	});

	// <div class="form-group">
	// 	<label>Expire</label>
	// 	<input type="text" class="form-control" placeholder="MM/YY" credit-card-expiration-entry year="expirationYear" year-digits="2" month="expirationMonth" ng-model="monthYear"
	// 	show-validation-icon ng-required="state.required"></input>
	// </div>
	module.directive('creditCardExpirationEntry', ['$compile', function($compile) {
		return {
			restrict: 'A',
			require: '?ngModel', 
			scope: {
				year: '=',
				month: '=',
				yearDigits: '@?',
				ngModel: '='
			},
			link: function($scope, $element, $attrs, ngModel) {
				var yearDigits= $attrs.yearDigits ? parseInt($attrs.yearDigits): 2;
				if(!ngModel) {
					return;
				}
				
				var linkFn = $compile('<autofill-expiration-fields></autofill-expiration-fields>');
				var content = linkFn($scope);
				$element.parent().append(content);
				
				$scope.$on('autofill-date', function(evt, params) {
					if(params.year.length==4 && params.month.length>=1)
					{
						var viewValue = '';
						if(params.month.length==1) {
							viewValue = '0'+params.month;
						} else {
							viewValue = params.month;
						}
						viewValue += '/';
						
						if(yearDigits==2)
						{
							viewValue += params.year.substr(2);
						} else {
							viewValue += params.year;
						}

						ngModel.$setViewValue(viewValue);
						ngModel.$render();
					}
				});
				

				function parseExpirationMonthYear(inputValue)
				{
					if (inputValue) {
						var digits = inputValue.replace(/[^0-9]/g, '');
						if(digits.length==1)
						{
							if(digits.substr(0,1) != '0' && digits.substr(0,1) != '1')
							{
								digits= '';
							}
						}
						if(digits.length==2)
						{
							if(digits.substr(0,1)=='1' && parseInt(digits.substr(1,1), 10)>2)
							{
								digits= digits.substr(0,1);
							} 
							else if(inputValue.length>=3 && inputValue.substr(2,1)=='/')
							{
								digits= inputValue.substr(0,3);
							}
						} 
						else if(digits.length>2)
						{
							digits= digits.substr(0,2)+'/'+digits.substr(2);
							digits= digits.substr(0, 3+yearDigits); // MM/YY
						}

						if (digits !== inputValue) {
							ngModel.$setViewValue(digits);
							ngModel.$render();
						}
						return digits;
					}
					return undefined;
				}
				
				function getMonth(value) {
					var result;
					
					if(value) {
						var digits = value.replace(/[^0-9]/g, '');
						if(digits.length>=2) {
							result= parseInt(digits.substr(0,2), 10);
						}
					}
					
					return result;
				}

				function getYear(value) {
					var result;
					
					if(value)
					{
						var digits = value.replace(/[^0-9]/g, '');
						if(digits.length==2+yearDigits) {
							if(yearDigits==2)
							{
								result= 2000 + parseInt(digits.substr(2,yearDigits), 10);
							} else {
								result= parseInt(digits.substr(2,yearDigits), 10);
							}
						}
					}
					
					return result;
				}

				ngModel.$validators.validExpirationDate= function(modelValue, viewValue) 
				{
					var value = modelValue || viewValue;
					var year= getYear(value);
					var month= getMonth(value);
					var valid= false;
					
					if(year !== undefined && month !== undefined)
					{
						var dt= new Date();
						
						if(year>dt.getFullYear())
						{
							valid= true;
						} 
						else if(year==dt.getFullYear() && month>(dt.getMonth()+1)) //dt.getMonth() is 0-11
						{
							valid= true;
						} 
					}
					
					if(!$element.prop('required'))
					{
						valid= true;
					}
					
					return valid;
				};

				ngModel.$parsers.unshift(parseExpirationMonthYear);

				// this is only if both are on the same page, which you wouldn't do.
				// $scope.$watch(function() {
				// 	return $scope.year+'-'+$scope.month;
				// }, function(newValue) {
				// 	var r= '';
				//
				// 	if($scope.month !== undefined) {
				// 		var m= parseInt($scope.month, 10);
				// 		if(m<10) {
				// 			r+= '0';
				// 			r+= m;
				// 		} else {
				// 			r+= m;
				// 		}
				// 		r+= '/';
				// 	}
				//
				// 	if($scope.year !== undefined) {
				// 		var y= parseInt($scope.year, 10);
				// 		if(yearDigits==2) {
				// 			r+= $scope.year.substr(2,2);
				// 		} else {
				// 			r+= y;
				// 		}
				// 	}
				//
				// 	if(ngModel.$modelValue !== r)
				// 	{
				// 		ngModel.$setViewValue(r);
				// 		ngModel.$render();
				// 		ngModel.$validate();
				// 	}
				// });
						
				$scope.$watch(function() {
					return ngModel.$modelValue;
				}, function(newValue) {
					if(newValue) {
						$scope.month= ''+getMonth(newValue); // convert to string, so it interops with the select list.
						$scope.year= ''+getYear(newValue);
					} else {
						$scope.month= undefined;
						$scope.year= undefined;
					}
				});
			}
		};
	}]);
	
  module.directive('creditCardInformation', ['$mvConfiguration', 'creditCards', function($mvConfiguration, creditCards) {
		return {
			restrict: 'E',
			templateUrl: function($element, $attrs) {
				var result= '';
				if($attrs.templateUrl !== undefined)
				{
					result= $attrs.templateUrl;
				} else {
					if($attrs.typeExpiration !== undefined)
					{
						result= $mvConfiguration.templateBasePath + 'credit-card-information-type-expiration.html';
					} else {
						result= $mvConfiguration.templateBasePath + 'credit-card-information.html';
					}
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
				cardRequired: "=?"
			},
      link: function($scope, $element, $attrs) {
				$scope.state= {
					months: [],
					allowCardSave: $scope.saveCard===undefined ? false : true,
					required: true,
				};
				
				$scope.$watch('cardRequired', function(newValue) {
					if(newValue===undefined)
					{
						$scope.state.required= true;
					} else {
						$scope.state.required= newValue;
					}
				});
      }
    };
  }]);
})();
