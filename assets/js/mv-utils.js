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