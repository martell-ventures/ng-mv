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
