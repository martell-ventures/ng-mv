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
                  resetFileInput();
                }, function(error) {
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
        onCompletion: '&?', // called on completion:  on-completion="imageUploaded(url)", url is the newly uploaded url.
        minImageWidth: '@?', // if type is image, won't upload if less than this width
        minImageHeight: '@?', // if type is image, won't upload if less than this height
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