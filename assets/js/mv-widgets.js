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
        var icon= angular.element('<span class=" form-control-feedback glyphicon glyphicon-ok hidden"></span>');
        $element.after(icon);

        function updateValidity(show, valid) {
          if(show)
          {
            if(valid)
            {
              formGroupParent.removeClass('has-error').addClass('has-success');
              icon.removeClass('hidden').removeClass('glyphicon-remove').addClass('glyphicon-ok');
            } else{
              formGroupParent.removeClass('has-success').addClass('has-error');
              icon.removeClass('hidden').removeClass('glyphicon-ok').addClass('glyphicon-remove');
            }
          } else {
            formGroupParent.removeClass('has-success').removeClass('has-error');
            icon.addClass('hidden');
          }
        }

        $scope.$watch($attrs.ngModel, function() {
          var showValidation= ngModel.$dirty || ngModel.$valid;
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
