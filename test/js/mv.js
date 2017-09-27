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
							setSelectionRange(digits.length); //Necessary for Android Chrome mobile
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
/* 
* mv-config
* Configuration provider for MV Angular Library
*
*/
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
})();
/* global FB */
(function() {
	var module = angular.module('mv.facebook', []);

  module.provider('$mvFacebookConfiguration', function() {
    function facebookScriptURL(debug, language) {
      if(language===undefined) {
        language= 'en_US';
      }
      if(debug===undefined) {
        debug= false;
      }

      var url= '//connect.facebook.net/'+language+'/';
      url+= debug ? 'all/debug.js' : 'all.js';
      
      return url;
    }
    
    var $mvFacebookConfiguration= {
      options: {
        applicationID: '',
        redirectURL: '',
        language: 'en_US',
        debug: false,
        facebookScriptURL: '//connect.facebook.net/en_US/all.js',
        scope: 'email',
        fields: 'email,first_name,last_name,name' //default fields to get from an api call
      },
      setLoginRequiredScope: function(scope) {
        this.options.scope= scope;
      },
      setDebugMode: function(debug) {
        this.options.debug= debug;
      },
      setApplicationID: function(id) {
        this.options.applicationID= id;
      },
      setRedirectURL: function(url) {
        this.options.redirectURL= url;
      },
      setLanguage: function(language) {
        this.options.language= language;
      },
	 setFields: function(fieldString) {
        this.options.fields= fieldString;
      },
      $get: ['$injector', function($injector) {
        var config= {
          applicationID: this.options.applicationID,
          redirectURL: this.options.redirectURL,
          facebookScriptURL: facebookScriptURL(this.options.debug, this.options.language),
          scriptDOMElementID: 'facebook-sdk-script',
          scope: this.options.scope,
          fields: this.options.fields
        };
        
        return config;
      }]
    };
    
    return $mvFacebookConfiguration;
  });

  // Lazy loading of Facebook Javascript API
  module.service('loadFacebookJavascript', ['$window', '$q', '$mvFacebookConfiguration', function($window, $q, $mvFacebookConfiguration ) {
      var deferred = $q.defer();

      // Load Facebook stuff
      function loadScript() {  
        if (!document.getElementById($mvFacebookConfiguration.scriptDOMElementID))
        {
          // Use global document since Angular's $document is weak
          var script = document.createElement('script');
          script.id= $mvFacebookConfiguration.scriptDOMElementID;
          script.src = $mvFacebookConfiguration.facebookScriptURL; // '//connect.facebook.net/en_US/all.js';
          document.body.appendChild(script);
        }
      }

      // called when the script is loaded.
      $window.fbAsyncInit= function() {
        FB.init({
          appId       : $mvFacebookConfiguration.applicationID,
          status      : true, // check login status
          cookie      : true, // enable cookies to allow the server to access the session
          xfbml       : true,  // parse XFBML
          redirect_url: $mvFacebookConfiguration.redirectURL
        });
        deferred.resolve();
      };

      if(!$mvFacebookConfiguration.applicationID || $mvFacebookConfiguration.applicationID.length===0) {
        alert('You must configure the facebook application id!');
        throw new Error("You must configure the facebook application id!");
      }

      if(!$mvFacebookConfiguration.redirectURL || $mvFacebookConfiguration.redirectURL.length===0) {
        alert('You must configure the facebook redirect URL!');
        throw new Error("You must configure the facebook redirect URL!");
      }

      loadScript();
      return deferred.promise;
    }
  ]);

  // Facebook callback - if you remove everything but the minimum settings:
  // {
  //  "response": {
  //     "id": "10152729382661345",
  //     "first_name": "Ryan",
  //     "gender": "male",
  //     "last_name": "Martell",
  //     "link": "https://www.facebook.com/app_scoped_user_id/10152729382661345/",
  //     "locale": "en_US",
  //     "name": "Ryan Martell",
  //     "timezone": -4,
  //     "updated_time": "2014-08-11T19:12:29+0000",
  //     "verified": true
  //   },
  //   "status": "success"
  // }
  // -- If they don't change it (we ask for email)
  // {
  //   "response": {
  //     "id": "10152729382661345",
  //     "email": "rdm@martellventures.com",
  //     "first_name": "Ryan",
  //     "gender": "male",
  //     "last_name": "Martell",
  //     "link": "https://www.facebook.com/app_scoped_user_id/10152729382661345/",
  //     "locale": "en_US",
  //     "name": "Ryan Martell",
  //     "timezone": -4,
  //     "updated_time": "2014-08-11T19:12:29+0000",
  //     "verified": true
  //   },
  //   "status": "success"
  // }
  // Facebook login Button
  // A, requires facebookLoginButton
  module.directive('facebookLoginButton', ['loadFacebookJavascript', '$timeout', '$parse', '$mvFacebookConfiguration', function( loadFacebookJavascript, $timeout, $parse, $mvFacebookConfiguration ) {
    return {
      restrict: 'A', // restrict by class name
      link: function( $scope, $element, $attrs ) {
        if(!$attrs.facebookLoginButton) {
          throw new Error('You must supply a facebook callback');
        }
        
        var expressionHandler = $parse($attrs.facebookLoginButton);
        
        // load the facebook javascript...
        loadFacebookJavascript.then(
          function() {
            // success!
            $element.on('click', function() {
              FB.login(function(response) {
                if (response.authResponse) {
                  FB.api('/me', {fields: $mvFacebookConfiguration.fields}, function(response) { //
                    // HERE: call the parsed function correctly (with scope AND params object)
                    $timeout(function() {
                      expressionHandler($scope, {status: 'success', response: response});
                    }, 50);
                  });
                } 
                else 
                {
                  $timeout(function() {
                    expressionHandler($scope, {status: 'cancelled', response: response});
                  }, 50);
                }
              }, {scope: $mvFacebookConfiguration.scope, auth_type:'rerequest'});
            });
          }, 
          function() {
            // rejected
            expressionHandler($scope, {status: 'loadingError', response: { }});
          }
        );
      }
    };
  }]);


  // Facebook login Button
  // A, 
  // facebookPostButton is required; you'd likely want it, as it will be called back with the login result if they had to login.
  //   Called back with status, and the response object
  // loginCallback is optional; you'd likely want it, as it will be called back IF the user logged in for this event.
  //   Called back with the same parameters as the facebookLoginButton above.
  // shareLink: @ - link to share
  // shareImage: @ - URL to share
  // shareName: @ - Name to share
  // shareDescription: @ - Description to share
  module.directive('facebookPostButton', ['loadFacebookJavascript', '$timeout', '$parse', '$mvFacebookConfiguration', function( loadFacebookJavascript, $timeout, $parse, $mvFacebookConfiguration ) {  
    return {
      restrict: 'A', // restrict by class name
      link: function( $scope, $element, $attrs ) {
        if(!$attrs.facebookPostButton) {
          throw new Error('You must supply a facebook callback');
        }
        
        var expressionHandler = $parse($attrs.facebookPostButton);
        var loginExpressionHandler = null;
        
        if($attrs.loginCallback) {
          loginExpressionHandler= $parse($attrs.loginCallback);
        }
        
        function performPost() {
          FB.ui(
            {
              method: 'feed', 
              link: $attrs.shareLink, 
              picture: $attrs.shareImage, 
              name: $attrs.shareName, 
              description: $attrs.shareDescription
            }, 
            function(postResponse) {
              $timeout(function() {
                if(postResponse)
                {
                  expressionHandler($scope, {status: 'success', response: postResponse});
                } else {
                  expressionHandler($scope, {status: 'cancelled', response: postResponse});
                }
              }, 50);
            }
          );
        }
        
        function updateApplicationForLogin() {
          if(loginExpressionHandler) {
            FB.api('/me', {fields: $mvFacebookConfiguration.fields}, function(response) {
              $timeout(function() {
                loginExpressionHandler($scope, {status: 'success', response: response});
              }, 50);
            });
          }
        }
        
        // load the facebook javascript...
        loadFacebookJavascript.then(
          function() {
            // success!
            $element.on('click', function() {
              // this is cached; so it's okay to do this in the click handler
              FB.getLoginStatus(function(statusResponse) {
                if(statusResponse.status=='connected')
                {
                  performPost();
                } else {
                  FB.login(function(response) {
                    if(response.authResponse) {
                      // perform the post.
                      performPost();
                    
                      // if they weren't logged in before, they just logged in to post; let the app know about it.
                      updateApplicationForLogin();
                    } else {
                      $timeout(function() {
                        expressionHandler($scope, {status: 'cancelled', response: response});
                      }, 50);
                    }
                  }, {scope: $mvFacebookConfiguration.scope});
                }
              });
            });
          }, 
          function() {
            // rejected
            expressionHandler($scope, {status: 'loadingError', response: { }});
          }
        );
      }
    };
  }]);

     module.factory('facebookDetails', ['$q', 'loadFacebookJavascript', function ($q, loadFacebookJavascript) {
               //Need to be logged in before calling this, or it will fail. Not worth setting this up right now to ensure login
               function getFBPhoto(height, width) {
                    var deferred = $q.defer();
                    loadFacebookJavascript.then(function () {
                         window.FB.api('/me/picture?height=' + height + '&width=' + width + '&redirect=false', function (picResponse) {
                              if (picResponse && !picResponse.error) {
                                   if (!picResponse.data.is_silhouette) {
                                        //only set the profile image if this is not the default FB image.
                                        deferred.resolve(picResponse.data.url);
                                   } else {
                                        deferred.reject('No profile image or only default silhouette available');
                                   }
                              } else {
                                   deferred.reject('Error with API');
                              }
                         });
                    });
                    return deferred.promise;
               }

               return {
                    getPhoto: function (height, width) {
                         return getFBPhoto(height, width);
                    }
               };
          }
     ]);
})();
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
			getResult.then(function(responseData) {
				countryLoadDeferred.resolve(responseData.data);
			}, function(data, status) {
				countryLoadDeferred.reject(status);
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
/*
<style>
.btn-file {
    position: relative;
    overflow: hidden;
}
.btn-file input[type=file] {
    position: absolute;
    top: 0;
    right: 0;
    min-width: 100%;
    min-height: 100%;
    font-size: 100px;
    text-align: right;
    filter: alpha(opacity=0);
    opacity: 0;
    outline: none;
    background: white;
    cursor: inherit;
    display: block;
}
</style>
*/
(function() {
  var module = angular.module('mv.upload.button', []);

  // type (based to endpointURL for configuration)
  // accept - file[input] accept type
  // identifier -  (passed to endpointURL for configuration)
  // endpointUrl - endpoint URL (called with JSON body, POST, verb: upload-parameters, upload-complete)
  // previewImageSrc: '=?', // if set, and upload is type image, will load it here from local (prior to upload)
  // onCompletion: '&?', // called on completion:  on-completion="imageUploaded(url)", url is the newly uploaded url.
  // uploadProgress: '=?', // upload Progress
  // uploading: '=?', // true once we start uploading.
	// defaultPreviewImage: '@' // default preview image (if not a image file)
  // minImageWidth: @ // if present, minimum allowable image width
  // minImageHeight: @ // if present, minimum allowable image height
  module.directive('mvInlineUploadButton', ['$q', '$http', '$parse', function($q, $http, $parse) {
    return {
      restrict: 'A',
      scope: true,
      link: function($scope, $element, $attrs) {
        $element.addClass('upload_button');
        $element.append('<input type="file" accept="'+$attrs.accept+'">');
        
        var params= null;
        var previewImageSrcModel= null;
        var onCompletionModel= null;
        var uploadProgressModel= null;
        var uploadingModel= null;
        
        if($attrs.previewImageSrc)
        {
          previewImageSrcModel= $parse($attrs.previewImageSrc);
        }
        
        if($attrs.onCompletion)
        {
          onCompletionModel= $parse($attrs.onCompletion);
        }
        
        if($attrs.uploadProgress)
        {
          uploadProgressModel= $parse($attrs.uploadProgress);
        }

        if($attrs.uploading)
        {
          uploadingModel= $parse($attrs.uploading);
        }
        
        // bind the change handler...
        $element.find('input[type=file]').on('change', function() {
          if($(this).val())
          {
            var files = !!this.files ? this.files : [];
            if(files.length)
            {
              var fullPath = $(this).val();
              var objectIdentifier= $attrs.identifier;
              if (fullPath) {
                var filename= files[0].name;
                var filetype= files[0].type;

                var acceptParts= $attrs.accept.split('/');
                var fileTypeParts= filetype.split('/');
                var validFileType= true;
                if(acceptParts.length==fileTypeParts.length)
                {
                  for(var ii= 0; ii<acceptParts.length; ii++)
                  {
                    if(acceptParts[ii]!=fileTypeParts[ii] && acceptParts[ii]!='*')
                    {
                      validFileType= false;
                    }
                  }
                }
                
                // only if the file type is valid.
                if(validFileType)
                {
                  if(window.FileReader)
                  {
                    if (/^image/.test( filetype )){ // only image file
                      var minWidth= $attrs.minImageWidth || 0;
                      var minHeight= $attrs.minImageHeight || 0;

                      var reader = new FileReader(); // instance of the FileReader

                      reader.onloadend = function() { // set image data as background of div
                        var imageData= this.result;
                        if(minWidth || minHeight)
                        {
                          var img= new Image();
                          img.onload= function() {
                            if((minWidth && this.width<minWidth) || (minHeight && this.height<minHeight))
                            {
                              var lines= [];
                              lines.push("This image is too small.");
                              if(minWidth) {
                                lines.push("It must be at least "+minWidth+" pixels wide (It is currently "+this.width+")");
                              }
                              if(minHeight) {
                                lines.push("It must be at least "+minHeight+" pixels tall (It is currently "+this.height+")");
                              }
                              alert(lines.join("\n"));
                              resetFileInput();
                            } else {
                              $scope.$apply(function(){
                                // Start the upload
                                start_upload(filename, filetype);
                              });
                            }
                          };
                          img.src= imageData;
                        } 

                        $scope.$apply(function(){
                          previewImageSrcModel.assign($scope, imageData);
                          // Start the upload if no minimum size reqirements
                          if(!minWidth && !minHeight)
                          {
                            start_upload(filename, filetype);
                          }
                        });
                      };

                      reader.readAsDataURL(files[0]); // read the local file
                    } else if($attrs.defaultPreviewImage) {
                      // not image type, assign default if required
                      previewImageSrcModel.assign($scope, $attrs.defaultPreviewImage);
                      
                      // Start the upload
                      start_upload(filename, filetype);
                    } else {
                      //not an image and default preview image also not specified, so just upload it
                      start_upload(filename, filetype);
                    }
                  } else {
                    // old browser; likely won't work anyway, but...
                    start_upload(filename, filetype);
                  }
                } else {
                  var errorMsg= "Invalid file type!";
                  if(acceptParts.length)
                  {
                    switch(acceptParts[0])
                    {
                    case 'video':
                      errorMsg= "The selected file is not a valid video file.";
                      break;
                    case 'image':
                      errorMsg= "The selected file is not a valid image file.";
                      break;
                    case 'audio':
                      errorMsg= "The selected file is not a valid audio file.";
                      break;
                    }
                  }
                  alert(errorMsg);
                  resetFileInput();
                }
              }
            }
          }
        });

        // this wraps in a form, resets the file input, and then unwraps (so yuo can upload the same file twice)
        function resetFileInput() {
          var e= $element.find('input[type=file]');
          e.wrap('<form>').closest('form').get(0).reset();
          e.unwrap();
        }
        
        function setUploading(uploading) {
          if(uploadingModel)
          {
            uploadingModel.assign($scope, uploading);
          }
        }
        
        function postUploadComplete() {
          return $q(function(resolve, reject) {
            $http.post($attrs.endpointUrl, { 
              verb: 'upload-complete', 
              id: $attrs.identifier,
              bucket: params.uploadBucket,
              key: params.uploadKey,
              type: $attrs.type,
              mimeType: params.mimeType
            }).then(function(data) {
              if(data.data.success) {
                resolve(data.data);
              } else {
                alert(data.data.message);
                reject();
              }
            }, reject);
          });
        }
        
        function start_upload(filename, filetype) 
        {
          $http.post($attrs.endpointUrl, { 
            verb: 'upload-parameters', 
            filename: filename, 
            id: $attrs.identifier, 
            type: $attrs.type,
            mimeType: filetype
          }).then(function(data) {
            if(data.data.success)
            {
              params= {
                postURL: data.data.result['url'],
                uploadBucket: data.data.result['bucket'],
                uploadParameters: data.data.result['params'],
                uploadKey: data.data.result['params']['key'],
                mimeType: data.data.result['mimeType']
              };
          
              setUploading(true);
              upload().then(function(data) {
                postUploadComplete().then(function(data) {
                  if(onCompletionModel)
                  {
                    // pass to the completion model everything we get back from the server on completion.
                    onCompletionModel($scope, data.result);
                      // {
                      //   bucket: data.result['bucket'],
                      //   key: data.result['key'],
                      //   url: data.result['url']
                      // });
                  }
                  setUploading(false);
                  resetFileInput();
                }, function(error) {
                  setUploading(false);
                  resetFileInput();
                });
              }, function(failure) {
                switch(failure.reason)
                {
                case 'loadFailed':
                  alert("There was an error attempting to upload the file." + failure.evt.response);
                  break;
                case 'error':
                  alert("There was an error attempting to upload the file." + failure.evt.response);
                  break;
                case 'aborted':
                  alert("The upload has been canceled by the user or the browser dropped the connection.");
                  break;
                }
                setUploading(false);
                resetFileInput();
              });
            } else {
              alert(data.data.message);
              resetFileInput();
            }
          });
        }
        
        function upload() 
        {
          return $q(function(resolve, reject) {
            var fd= new FormData();

            // Populate the Post paramters.
            for(var key in params.uploadParameters)
            {
              fd.append(key, params.uploadParameters[key]);
            }
            fd.append('success_action_status', 201);
          
            var file = $element.find('input[type=file]').get(0).files[0];
            fd.append('file', file);

          //	    var xhr = getXMLHTTPObject(); // FIXME browser
            var xhr= new XMLHttpRequest();

            // add progress listener
            xhr.upload.addEventListener("progress", 
              function(evt) {
                if (evt.lengthComputable) {
                  var percentComplete = Math.round(evt.loaded * 100 / evt.total);
                
                  if(uploadProgressModel) {
                    if(percentComplete != uploadProgressModel($scope))
                    {
                      $scope.$apply(function() {
                        uploadProgressModel.assign($scope, percentComplete);
                      });
                    }
                  }
                } else {
                  // non computable, make the progress bar be hidden?
                }
              }, false);
          
            xhr.addEventListener("load", function(xhr) {
              if(xhr && xhr.currentTarget.status==201)
              {
                $scope.$apply(function() {
                  resolve();
                });
              } else {
                $scope.$apply(function() {
                  reject({ reason: 'loadFailed', evt: xhr.currentTarget });
                });
                  
//                ("There was an error attempting to upload the file." + xhr.currentTarget.response);
              }
            }, false);
          
            xhr.addEventListener("error", function(evt) {
              $scope.$apply(function() {
                reject({ reason: 'error', evt: evt });
              });
//alert("There was an error attempting to upload the file." + evt);
          	}, false);
          
            xhr.addEventListener("abort", function(evt) {
              $scope.$apply(function() {
                reject({ reason: 'aborted' });
              });
//alert("The upload has been canceled by the user or the browser dropped the connection.");
            }, false);

            // set to 0
            if(uploadProgressModel)
            {
              uploadProgressModel.assign($scope, 0);
            }
            
            xhr.open('POST', params.postURL, true);
            xhr.send(fd);
          });
        }
      }
    };
  }]);

  module.directive('mvUploadButtonWithProgress', ['$q', '$http', function($q, $http) {
    return {
      restrict: 'E',
      scope: {
        title:'@', // title of the button
        accept: '@', // mime type to accept
        type: '@', // type (bassed to endpointURL for configuration)
        identifier: '@', // identifier (passed to endpointURL for configuration)
        endpointUrl: '@', // endpoint URL (called with JSON body, POST, verb: upload-parameters, upload-complete)
        previewImageSrc: '=?', // if set, and upload is type image, will load it here from local (prior to upload)
        onCompletion: '&?', // called on completion:  on-completion="imageUploaded(url)", url is the newly uploaded url.
        minImageWidth: '@?', // if type is image, won't upload if less than this width
        minImageHeight: '@?', // if type is image, won't upload if less than this height
        uploading: '=?' // if there, shows true/false while uploading.
      },
      template:
        '<div>'+
          '<progressbar ng-show="state.uploading" style="width: 100%;" value="state.progress"></progressbar>'+
          '<span ng-show="!state.uploading" class="btn btn-file btn-default btn-sm" '+
          'mv-inline-upload-button '+
            'type="{{ type }}" '+
            'accept="{{ accept }}" '+
            'identifier="{{ identifier }}" '+
            'endpoint-url="{{ endpointUrl }}" '+
            'preview-image-src="state.previewImageSrc" '+
            'on-completion="complete(bucket, key, url)" '+
            'upload-progress="state.progress" '+
            'uploading="state.uploading" '+
            'min-image-width="{{ minImageWidth }}" '+
            'min-image-height="{{ minImageHeight }}" '+
            '>{{ title }}</span>'+
        '</div>',
      link: function($scope, $element, $attrs) {
        $scope.state= {
          uploading: false,
          progress: 0,
          previewImageSrc: null
        };
        
        $scope.$watch('state.previewImageSrc', function(newValue) {
          if($scope.previewImageSrc) {
            $scope.previewImageSrc= newValue;
          }
        });
        
        // uploading is optional attribute
        if($attrs.uploading)
        {
          $scope.$watch('state.uploading', function(newValue) {
            $scope.uploading= newValue;
          });
        }
        
        $scope.complete= function(bucket, key, url) {
          if($scope.onCompletion)
          {
            $scope.onCompletion({ bucket: bucket, key: key, url: url });
          }
        };
      }
    };
  }]);
})();/*
	Dialogs service with:
		Confirm (message, title, buttons).then....
		SingleTextAreaEntry(message, title, buttons).then..
		
	UtilService
		CalculateTimeDeltas
	
	Filters
		capitalize
		max
*/
(function() {
	var app= angular.module('mv.utils', ['mv.filters', 'mv.configuration', 'ui.bootstrap']);
	
	app.directive("flagCheckbox", ['$timeout', function($timeout) {
		return {
			restrict: 'A',
			scope: {
				flags: '=',
				flag: '@flagCheckbox'
			},
			link: function($scope, $element, $attributes) {
				var flag = parseInt($scope.flag);

				$scope.$watch('flags', function(newValue) {
					if(newValue !== undefined) {
						if(newValue & flag) {
							$element[0].checked = true;
						} else {
							$element[0].checked = false;
						}
					}
				});

				$element.on('click', function() {
					// timeout is to put it back into angular scope
					$timeout(function() {
						if($element[0].checked) {
							$scope.flags |= flag;
						} else {
							$scope.flags &= ~flag;
						}
					}, 1);
				});
			}
		};
	}]);

	// use this to compare to and validate password and confirm passwrods.
	app.directive("compareTo", function() {
		return {
			require: 'ngModel',
			scope: {
				otherModelValue: '=compareTo'
			},
			link: function($scope, $element, $attributes, ngModel) {
				ngModel.$validators.compareTo= function(modelValue) {
					return modelValue == $scope.otherModelValue;
				};
				
				$scope.$watch('otherModelValue', function() {
					ngModel.$validate();
				});
			}
		};
	});

	app.service('Dialogs', ['$uibModal', '$sce', '$mvConfiguration', function($uibModal, $sce, $mvConfiguration) {
		this.Confirm= function(message, title, buttons) {
			return $uibModal.open({
				controller: ['$scope', '$uibModalInstance', 'message', 'title', 'buttons', function($scope, $uibModalInstance, message, title, buttons) {
					$scope.message= $sce.trustAsHtml(message);
					$scope.title= title;
					$scope.buttons= buttons;
					
					$scope.clickButton= function(button) {
						if(button.type=='cancel')
						{
							$uibModalInstance.dismiss(button.name);
						} else {
							$uibModalInstance.close(button);
						}
					};
				}],
				templateUrl: $mvConfiguration.templateBasePath+'dialogs/confirm-modal.html',
				resolve: {
					message: function() {
						return message;
					},
					buttons: function() {
						if(buttons === undefined)
						{
							return [ { name: 'OK', type: 'ok' }, { name: 'Cancel', type: 'cancel'} ];
						} else {
							return buttons;
						}
					},
					title: function() {
						if(title === undefined)
						{
							return "Confirm";
						} else {
							return title;
						}
					}
				}
			}).result;
		};
		
		this.SingleTextAreaEntry= function(message, title, buttons) {
			return $uibModal.open({
				controller: ['$scope', '$uibModalInstance', '$mvConfiguration', 'message', 'title', 'buttons', function($scope, $uibModalInstance, $mvConfiguration, message, title, buttons) {
					$scope.message= $sce.trustAsHtml(message);
					$scope.title= title;
					$scope.buttons= buttons;
					$scope.params= {
						textAreaEntry: ''
					};
					
					$scope.clickButton= function(button) {
						if(button.type=='cancel')
						{
							$uibModalInstance.dismiss(button.name);
						} else {
							$uibModalInstance.close({
								button: button,
								textAreaEntry: $scope.params.textAreaEntry
							});
						}
					};
				}],
				templateUrl: $mvConfiguration.templateBasePath+'dialogs/single-text-area-modal.html',
				resolve: {
					message: function() {
						return message;
					},
					buttons: function() {
						if(buttons === undefined)
						{
							return [ { name: 'OK', type: 'ok' }, { name: 'Cancel', type: 'cancel'} ];
						} else {
							return buttons;
						}
					},
					title: function() {
						if(title === undefined)
						{
							return "Confirm";
						} else {
							return title;
						}
					}
				}
			}).result;
		};
	}]);
	
	app.service('UtilService', function() {
		// expects startDate and endDate to be
		// NOTE: this function needs to take into consideration:
		// 1) Projects end at 23:59 on the end date, PST.
		// 2) The dates in javascript are likely going to be in local timezone.
		// FIXME!
		this.CalculateTimeDeltas= function(startDateStr, endDateStr) 
		{
			var now= new Date();
			var end= null;
			var projectStart= null;
			
			if(endDateStr)
			{
				if(endDateStr instanceof Date)
				{
					end= endDateStr;
				} else if(endDateStr != '0000-00-00') {
					end= Date.parse(endDateStr);
				}
			}
			
			if(startDateStr) {
				if(startDateStr instanceof Date)
				{
					projectStart= startDateStr;
				} else {
					projectStart = Date.parse(startDateStr);
				}
			} else {
				projectStart= now;
			}
			
			var result= {
				days: 0,
				hours: 0,
				minutes: 0,
				seconds: 0,
				timeUnits: '',
				timeValue: ''
			};
			
			if(end != null)
			{
				var start= (now > projectStart) ? now : projectStart;
				
				// get total seconds between the times
				if(start < end)
				{
					var delta = Math.abs(end - start) / 1000;

					// calculate (and subtract) whole days
					var days = Math.floor(delta / 86400);
					delta -= days * 86400;

					// calculate (and subtract) whole hours
					var hours = Math.floor(delta / 3600) % 24;
					delta -= hours * 3600;

					// calculate (and subtract) whole minutes
					var minutes = Math.floor(delta / 60) % 60;
					delta -= minutes * 60;

					// what's left is seconds
					var seconds = delta % 60;  // in theory the modulus is not required

					result.days= days;
					result.hours= hours;
					result.minutes= minutes;
					result.seconds= seconds;
				
					if(days>0)
					{
						result.timeValue= days;
						result.timeUnits= days==1 ? 'day left' : 'days left';
					} else if(hours>0) {
						result.timeValue= hours;
						result.timeUnits= hours==1 ? 'hour left' : 'hours left';
					} else if(minutes>0) {
						result.timeValue= minutes;
						result.timeUnits= minutes==1 ? 'minute left' : 'minutes left';
					} else if(seconds>0) {
						result.timeValue= seconds;
						result.timeUnits= seconds==1 ? 'second left' : 'seconds left';
					}
				} else {
					result.timeValue= '';
				}
			} else {
				result.timeValue= 'Unknown';
				result.timeUnits= 'days left';
			}
			
			return result;
		};
	});
	
	// from http://stackoverflow.com/questions/16091218/angularjs-allows-only-numbers-to-be-typed-into-a-text-box
	// the only thing that sucks about this is it happens after the key is pressed, and the value is updated, so it will rollback, but it's not blocking the characer
	// so sometimes you see it briefly
	app.directive("onlyDigits", function ()
	{
		return {
			restrict: 'EA',
			require: '?ngModel',
			// scope:{
			// 	allowDecimal: '@',
			// 	allowNegative: '@',
			// 	minNum: '@',
			// 	maxNum: '@'
			// },
			link: function ($scope, $element, $attrs, ngModel)
			{
				if (ngModel)
				{
					ngModel.$parsers.unshift(function (inputValue)
					{
						var decimalFound = false;
						var digits = inputValue.split('').filter(function (s,i)
						{
							var b = (!isNaN(s) && s != ' ');
							if (!b && $attrs.allowDecimal && $attrs.allowDecimal == "true")
							{
								if (s == "." && decimalFound === false)
								{
									decimalFound = true;
									b = true;
								}
							}
							if (!b && $attrs.allowNegative && $attrs.allowNegative == "true")
							{
								b = (s == '-' && parseInt(i) === 0);
							}

							return b;
						}).join('');

						if ($attrs.maxNum && !isNaN($attrs.maxNum) && parseFloat(digits) > parseFloat($attrs.maxNum))
						{
							digits = $attrs.maxNum;
						}
					
						if ($attrs.minNum && !isNaN($attrs.minNum) && parseFloat(digits) < parseFloat($attrs.minNum))
						{
							digits = $attrs.minNum;
						}

						ngModel.$setViewValue(digits);
						ngModel.$render();

						return digits;
					});
				}
			}
		};
	});
	//a different example from http://stackoverflow.com/questions/16091218/angularjs-allows-only-numbers-to-be-typed-into-a-text-box
	//this isn't as powerful as above, but when default value in the input is '', the above only-numeric does weird things.  FIXME, then remove this?
	app.directive('onlyNumber', function () {
		return {
			require: 'ngModel',
			restrict: 'AC',
			link: function ($scope, $element, $attr, ngModel) {
				function inputValue(val) {
					if (val) {
						var digits = val.replace(/[^0-9]/g, '');
						if (digits !== val) {
							ngModel.$setViewValue(digits);
							ngModel.$render();
						}
						return parseInt(digits,10);
					}
					return undefined;
				}
				ngModel.$parsers.push(inputValue);
			}
		};
	});
  
	//automatically adds a comma for every thousands in an input box.  Only for display (non-comma number is preserved internally)
	//taken from the fiddle in this question: http://stackoverflow.com/questions/24001895/angularjs-number-input-formatted-view
	// rdm: added the only digits and commans parser to help keep this real.
	app.directive('thousandsComma', ['$filter', function ($filter) {
		return {
			require: '?ngModel',
			link: function ($scope, $element, $attrs, ngModel) {
				if (!ngModel) {
					return;
				}
						
				function commaInThousandsParser(viewValue) {
					var b;
					var plainNumber;
					if (viewValue !== '') {
						plainNumber = viewValue.replace(/[\,\.]/g, '');
						b = $filter('number')(plainNumber);
						$element.val(b);
					} else {
						b = '';
						plainNumber = '';
					}
					$element.val(b);
					return plainNumber;
				}
				
				function onlyDigitsAndComma(val) {
					if (val) {
						var digits = val.replace(/[^0-9\,]/g, '');
						if (digits !== val) {
							ngModel.$setViewValue(digits);
							ngModel.$render();
						}
						return digits;
					}
					return undefined;
				}
				
				//formatters handle model->view changes (every time the model value changes, such as on load)
				ngModel.$formatters.unshift(function () {
					if (ngModel.$modelValue !== '') {
						return $filter('number')(ngModel.$modelValue);
					} else {
						return '';
					}
				});
				
				//parsers handle from view->model (every time the value changes in the view)
				ngModel.$parsers.unshift(commaInThousandsParser);
				ngModel.$parsers.unshift(onlyDigitsAndComma);
			}
		};
	}]);
	
	
	// http://stackoverflow.com/questions/17470790/how-to-use-a-keypress-event-in-angularjs
	// use on input mv-enter="continue()" for example.
	app.directive('mvEnter', function () {
		return function ($scope, $element, $attrs) {
			$element.bind("keydown keypress", function (event) {
				if(event.which === 13) {
					$scope.$apply(function (){
						$scope.$eval($attrs.mvEnter);
					});

					event.preventDefault();
				}
			});
		};
	});	
	
		/**
		 * angular-elastic-input
		 * A directive for AngularJS which automatically resizes the width of input field according to the content, while typing.
		 * @author: Jacek Pulit <jacek.pulit@gmail.com>
		 * @license: MIT License
		 */
	// started from there; modified as had issues with placeholder, etc.
	//	'use strict';
	//	angular.module('puElasticInput', []).directive('puElasticInput', function () {
	app.directive('mvElasticInput', function () {
		return {
			require: "?ngModel",
			restrict: 'A',
			link: function postLink($scope, $element, $attrs, ngModel) {
				var wrapper = angular.element('<div style="position:fixed; top:-999px; left:0;"></div>');
				var mirror = angular.element('<span style="white-space:pre;"></span>');
				var defaultMaxwidth = $element.css('maxWidth') === 'none' ? $element.parent().innerWidth() : $element.css('maxWidth');
				$element.css('minWidth', $attrs.mvElasticInputMinwidth || $element.css('minWidth'));
				$element.css('maxWidth', $attrs.mvElasticInputMaxwidth || defaultMaxwidth);
				angular.forEach([
					'fontFamily',
					'fontSize',
					'fontWeight',
					'fontStyle',
					'letterSpacing',
					'textTransform',
					'wordSpacing',
					'textIndent',
					'boxSizing',
					'borderRightWidth',
					'borderLeftWidth',
					'borderLeftStyle',
					'borderRightStyle',
					'paddingLeft',
					'paddingRight',
					'marginLeft',
					'marginRight'
				], function (value) {
					mirror.css(value, $element.css(value));
				});

				angular.element('body').append(wrapper.append(mirror));
				function update() {
					if($attrs.placeholder) {
						mirror.text($element.val() || $attrs.placeholder);
					} else {
						mirror.text($element.val());
					}
					$element.css('width', mirror.outerWidth() + 1);
				}
			
				update();
				if (ngModel) {
					$scope.$watch($attrs.ngModel, function () {
						update();
					});
				} else {
					$element.on('keydown keyup focus input propertychange change', function () {
						update();
					});
				}
			}
		};
	});
})();

/* global jwplayer */
(function() {
  var module = angular.module('mv.widgets', []);

  // use on a bootstrap form element; will show a red x or a green checkmark if valid.
  module.directive('showValidationIcon', function() {
    return {
      restrict: 'A',
      require: '?ngModel',
      link: function($scope, $element, $attrs, ngModel) {
        if(!ngModel) {
          return;
        }

        var formGroupParent= $element.parents('.form-group:first');
        if(formGroupParent)
        {
          formGroupParent.addClass('has-feedback');
        }
        var icon;
        // the icon only works on inputs that aren't in input-groups
        if($element.prop('tagName')=='INPUT' && !$element.parent().hasClass('input-group'))
        {
          icon= angular.element('<span class=" form-control-feedback glyphicon glyphicon-ok hidden"></span>');
          $element.after(icon);
        }

        function updateValidity(show, valid) {
          if(show)
          {
            if(valid)
            {
              formGroupParent.removeClass('has-error').addClass('has-success');
              if(icon !== undefined)
              {
                icon.removeClass('hidden').removeClass('glyphicon-remove').addClass('glyphicon-ok');
              }
            } else{
              formGroupParent.removeClass('has-success').addClass('has-error');
              if(icon !== undefined)
              {
                icon.removeClass('hidden').removeClass('glyphicon-ok').addClass('glyphicon-remove');
              }
            }
          } else {
            formGroupParent.removeClass('has-success').removeClass('has-error');
            if(icon !== undefined)
            {
              icon.addClass('hidden');
            }
          }
        }

        $scope.$watch(function() {
          return ngModel.$dirty+'-'+ngModel.$valid+'-'+ngModel.$touched;
        }, function() {
          var showValidation= ngModel.$dirty || ngModel.$touched;// || ngModel.$valid;
          updateValidity(showValidation, ngModel.$valid);
        });
      }
    };
  });

  module.directive('flashAlert', ['$timeout', function($timeout) {
    return { 
      restrict: 'E',
      scope: {
        type: '=',
        message: '=',
        duration: '=?'
      },
      template: 
        '<div ng-show="message" class="alert" ng-class="alertClass">'+
          '<button type="button" class="close" ng-click="visible= false">x</button>'+
          '<strong>{{ strongText }}</strong> <span ng-bind-html="message"></span>'+
        '</div>',
      link: function($scope, $element, $attrs) {
        $scope.$watch('type', function() {
          if($scope.type)
          {
            switch($scope.type)
            {
            case 'info':
              $scope.alertClass= 'alert-info';
              $scope.strongText= '';
              break;
            case 'warning':
              $scope.alertClass= 'alert-warning';
              $scope.strongText= 'Warning:';
              break;
            case 'error':
              $scope.alertClass= 'alert-danger';
              $scope.strongText= 'Error:';
              break;
            case 'success':
              $scope.alertClass= 'alert-success';
              $scope.strongText= '';
              break;
            }
          }
        });
        
        $scope.$watch('message', function(newValue) {
          if(newValue) {
            var duration= $scope.duration || 5000;
            // and make it fade out after a certain amount of time...
            $timeout(function() {
              $scope.message= undefined; // we have to do this as well, so that if they get the same error multiple times, it will show up!
            }, duration);
          }
        });
      }
    };
  }]);


  module.directive('itemExpander', function() {
    return {
      restrict: 'E',
      transclude: true,
      scope: { 
        title:'@',
        expanded: '=?'
      },
      template: '<h4><a href="#" ng-click="toggle($event)"><span class="glyphicon" ng-class="iconClass"></span>{{ title }}</a></h4>'+
        '<div ng-show="expanded"><ng-transclude></ng-transclude></div>',
      link: function($scope, $element, $attrs) {
        $scope.toggle= function($event) {
          $event.preventDefault();
          $scope.expanded= !$scope.expanded;
        };
        
        $scope.$watch('expanded', function(newValue) {
          if(newValue) {
            $scope.iconClass= 'glyphicon-collapse-down';
          } else {
            $scope.iconClass= 'glyphicon-collapse-up';
          }
        });
      }
    };
  });
  
  // audio-url, container-id
  module.directive('audioPlayer', function() {
    return {
      restrict: 'E',
      link: function($scope, $element, $attrs) {
        if($attrs.audioUrl)
        {
          // append it..
          $element.append('<div id="'+$attrs.containerId+'">Loading the player...</div>');
          
          // now bind it
          jwplayer($attrs.containerId).setup({
            file: $attrs.audioUrl,
            supplied: 'mp3',
            width: '100%',
            height: 30
          });
        } else {
          $element.append('<p class="text-center h4">This audio is still processing on the server.<br/>Please refresh this page in a few minutes.</p>');
        }
      }
    };
  });

  // video-url, image-url, width, height, container-id
  module.directive('videoPlayer', function() {
    return {
      restrict: 'E',
      link: function($scope, $element, $attrs) {
        if($attrs.videoUrl)
        {
          // append it..
          $element.append('<div id="'+$attrs.containerId+'">Loading the player...</div>');
          
          // now bind it
          jwplayer($attrs.containerId).setup({
            file: $attrs.videoUrl,
            image: $attrs.imageUrl,
            width: '100%',
            aspectratio: $attrs.width+":"+$attrs.height,
            stretching: "exactfit"
          });
        } else {
          $element.append('<p class="text-center h4">This video is still processing on the server.<br/>Please refresh this page in a few minutes to view.</p>');
        }
      }
    };
  });
})();
