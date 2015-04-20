/* global FB */
(function() {
	var module = angular.module('mv.facebook', []);

  module.provider('$mvFacebookConfiguration', function() {
    var $mvFacebookConfiguration= {
      options: {
        applicationID: '',
        redirectURL: '',
        facebookScriptURL: '//connect.facebook.net/en_US/all.js'
      },
      setApplicationID: function(id) {
        this.options.applicationID= id;
      },
      setRedirectURL: function(url) {
        this.options.redirectURL= url;
      },
      $get: ['$injector', function($injector) {
        var config= {
          applicationID: this.options.applicationID,
          redirectURL: this.options.redirectURL,
          facebookScriptURL: this.options.facebookScriptURL
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
          // Use global document since Angular's $document is weak
          var script = document.createElement('script');
          script.src = $mvFacebookConfiguration.facebookScriptURL; // '//connect.facebook.net/en_US/all.js';
          document.body.appendChild(script);
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
  // A, requires facebook-callback
  module.directive('facebookLoginButton', ['loadFacebookJavascript', '$timeout', '$parse', function( loadFacebookJavascript, $timeout, $parse ) {  
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
                  FB.api('/me', function(response) {
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
              }, {scope: 'email'});  
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

})();
