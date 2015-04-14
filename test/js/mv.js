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
				cvcLength: [4],
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
				
				function digitsAndSpaceParser(inputValue) {
					if (inputValue) {
						var digits = inputValue.replace(/[^0-9 ]/g, '');
						if (digits !== inputValue) {
							ngModel.$setViewValue(digits);
							ngModel.$render();
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

				$scope.$watch(function() {
					return $element.prop('required');
				}, function(newValue) {
					ngModel.$validate();
				});
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
					var valid= false;
					
					// if digits only...
					if($scope.countryCode=='US')
					{
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
					
					if(!$element.prop('required'))
					{
						valid= true;
					}
					
					return valid;
				}
				
				// add our validator..
				ngModel.$validators.validUSZip= validUSZip;

				$scope.$watch('countryCode', function(newCode, oldCode) {
					if(newCode=='US')
					{
						ngModel.$parsers.unshift(parseUSZip);
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
					return $element.prop('required');
				}, function(newValue) {
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
				
				var lastSelectedState= {};
				$scope.$watch('state', function(newValue, oldValue) {
					if(newValue !== oldValue) {
						lastSelectedState[$scope.country]= newValue;
					}
				});


				$scope.stateRequired= function() {
					var req;
					
					if($scope.country=='US' || $scope.country=='CA')
					{
						req= $scope.requiredFields['state'];
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
(function() {
  var module = angular.module('mv.upload.button', ['ui.bootstrap']);

  // type (based to endpointURL for configuration)
  // accept - file[input] accept type
  // identifier -  (passed to endpointURL for configuration)
  // endpointUrl - endpoint URL (called with JSON body, POST, verb: upload-parameters, upload-complete)
  // previewImageSrc: '=?', // if set, and upload is type image, will load it here from local (prior to upload)
  // onCompletion: '&?', // called on completion:  on-completion="imageUploaded(url)", url is the newly uploaded url.
  // uploadProgress: '=?', // upload Progress
  // uploading: '=?', // true once we start uploading.
	// defaultPreviewImage: '@' // default preview image (if not a image file)
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
                      var reader = new FileReader(); // instance of the FileReader
                      reader.readAsDataURL(files[0]); // read the local file

                      reader.onloadend = function() { // set image data as background of div
                        var imageData= this.result;
                        $scope.$apply(function(){
                          previewImageSrcModel.assign($scope, imageData);
                        });
                      };
                    } else if($attrs.defaultPreviewImage) {
                      previewImageSrcModel.assign($scope, $attrs.defaultPreviewImage);
                    }
                  }

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
                  
                      upload().then(function(data) {
                        postUploadComplete().then(function(data) {
                          if(onCompletionModel)
                          {
                            onCompletionModel($scope, 
                              { 
                                bucket: data.result['bucket'],
                                key: data.result['key'],
                                url: data.result['url']
                              });
                          }
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
                        resetFileInput();
                      });
                    } else {
                      alert(data.data.message);
                      resetFileInput();
                    }
                  });
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
                  if(uploadingModel)
                  {
                    uploadingModel.assign($scope, false);
                  }
                  resolve();
                });
              } else {
                $scope.$apply(function() {
                  if(uploadingModel)
                  {
                    uploadingModel.assign($scope, false);
                  }
                  reject({ reason: 'loadFailed', evt: xhr.currentTarget });
                });
                  
//                ("There was an error attempting to upload the file." + xhr.currentTarget.response);
              }
            }, false);
          
            xhr.addEventListener("error", function(evt) {
              $scope.$apply(function() {
                if(uploadingModel)
                {
                  uploadingModel.assign($scope, false);
                }
                reject({ reason: 'error', evt: evt });
              });
//alert("There was an error attempting to upload the file." + evt);
          	}, false);
          
            xhr.addEventListener("abort", function(evt) {
              $scope.$apply(function() {
                if(uploadingModel)
                {
                  uploadingModel.assign($scope, false);
                }
                reject({ reason: 'aborted' });
              });
//alert("The upload has been canceled by the user or the browser dropped the connection.");
            }, false);

            if(uploadingModel)
            {
              uploadingModel.assign($scope, true);
            }

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
        onCompletion: '&?' // called on completion:  on-completion="imageUploaded(url)", url is the newly uploaded url.
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
        
        $scope.complete= function(bucket, key, url) {
          if($scope.onCompletion)
          {
            $scope.onCompletion({ bucket: bucket, key: key, url: url });
          }
        };
      }
    };
  }]);
})();
/*
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

	app.service('Dialogs', ['$modal', '$sce', '$mvConfiguration', function($modal, $sce, $mvConfiguration) {
		this.Confirm= function(message, title, buttons) {
			return $modal.open({
				controller: ['$scope', '$modalInstance', 'message', 'title', 'buttons', function($scope, $modalInstance, message, title, buttons) {
					$scope.message= $sce.trustAsHtml(message);
					$scope.title= title;
					$scope.buttons= buttons;
					
					$scope.clickButton= function(button) {
						if(button.type=='cancel')
						{
							$modalInstance.dismiss(button.name);
						} else {
							$modalInstance.close(button);
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
			return $modal.open({
				controller: ['$scope', '$modalInstance', '$mvConfiguration', 'message', 'title', 'buttons', function($scope, $modalInstance, $mvConfiguration, message, title, buttons) {
					$scope.message= $sce.trustAsHtml(message);
					$scope.title= title;
					$scope.buttons= buttons;
					$scope.params= {
						textAreaEntry: ''
					};
					
					$scope.clickButton= function(button) {
						if(button.type=='cancel')
						{
							$modalInstance.dismiss(button.name);
						} else {
							$modalInstance.close({
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
        if($element.prop('tagName')=='INPUT')
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
        '<div ng-show="visible" class="alert" ng-class="alertClass">'+
          '<button type="button" class="close" ng-click="visible= false">x</button>'+
          '<strong>{{ strongText }}</strong><span ng-bind-html="message"></span>'+
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
        
        $scope.$watch('message', function() {
          if($scope.message) {
              var duration= $scope.duration || 5000;
              // and make it fade out after a certain amount of time...
              $timeout(function() {
                $scope.visible= false;
              }, duration);
            
            // start timeout.
            $scope.visible= true;
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
