(function() {
  var module = angular.module('mv.widgets.datepicker', [] );

	module.directive('mvSelectDatepicker', ['$mvConfiguration', function($mvConfiguration) {
		var months= [
			{ id:  0, label: 'January' },
			{ id:  1, label: 'February' },
			{ id:  2, label: 'March' },
			{ id:  3, label: 'April' },
			{ id:  4, label: 'May' },
			{ id:  5, label: 'June' },
			{ id:  6, label: 'July' },
			{ id:  7, label: 'August' },
			{ id:  8, label: 'September' },
			{ id:  9, label: 'October' },
			{ id: 10, label: 'November' },
			{ id: 11, label: 'December' }
		];

		function regenerateDays(month, year) {
			var maxDays;
			if(month===undefined || year===undefined)
			{
				maxDays= 31;
			} else {
				maxDays= new Date(year, month+1, 0).getDate();
			}

			var result= [];
			for(var ii= 1; ii<=maxDays; ii++)
			{
				result.push({ id: ii, label: ii });
			}
			
			return result;
		}
		
		function getYears(attr) {
			var now= new Date();
			var years= [];
			var ii;
			
			if(attr.firstYear) 
			{
				for(ii = parseInt(attr.firstYear); ii<=now.getFullYear(); ii++)
				{
					years.push({ id: ii, label: ii });
				}
				years.reverse();
			} else {
				// from now until 10 years in the future; assuming Credit Card.
				for(ii= now.getFullYear(); ii<=now.getFullYear()+10; ii++)
				{
					years.push({ id: ii, label: ii });
				}
			}
			
			return years;
		}

		return {
			restrict: 'E',
			require: 'ngModel',
			scope: {
				firstYear: '@',
			},
			templateUrl: function(tElement, tAttrs) {
				var result= '';
				if(tAttrs['templateUrl'] !== undefined)
				{
					result= tAttrs['templateUrl'];
				} else {
					result= $mvConfiguration.templateBasePath + 'select-date-picker.html';
				}

				return result;
			},
			link: function($scope, $element, $attr, ngModelController) {
				var ii;
				$scope.disabled= false;

				if($attr.ngDisabled !== undefined)
				{
					// $scope.$parent.$watch?
					$scope.$parent.$watch($attr.ngDisabled, function(newVal){
						$scope.disabled= newVal;
					});
				}
				
				// default.
				$scope.current= {
					day: undefined,
					month: undefined,
					year: undefined,
					days: regenerateDays(),
					months: months,
					years: getYears($attr)
				};

				// changing the ngModel value calls this.
				ngModelController.$render = function() {
					var dt;
					if(ngModelController.$viewValue !== undefined)
					{
						dt= new Date(ngModelController.$viewValue);
					}

					$scope.current.day= dt ? dt.getUTCDate() : undefined;
					$scope.current.month= dt ? dt.getUTCMonth() : undefined;
					$scope.current.year= dt ? dt.getUTCFullYear() : undefined;
					$scope.current.days= regenerateDays($scope.current.month, $scope.current.year);
				};
								
				// called by the select list ng-change
				$scope.fieldChanged= function(which) {
					$scope.current.days= regenerateDays($scope.current.month, $scope.current.year);
					if($scope.current.day !== undefined && $scope.current.month !== undefined && $scope.current.year !== undefined)
					{
						ngModelController.$setViewValue(new Date($scope.current.year, $scope.current.month, $scope.current.day));
					} else {
						ngModelController.$setViewValue(undefined);
					}
				};
			}
		};
	}]);
})();
