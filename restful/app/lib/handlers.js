//request handlers

//dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');

var handlers = {};

//define users
handlers.users = function(data,callback){
	//we don't accept any other methods in this route
	var acceptableMethods = ['','get','post','put','delete'];
	if(acceptableMethods.indexOf(data.method)){
		handlers._users[data.method](data,callback);
	} else{
		callback(405);
	}
};

//container _users indicates that it is a private function of users
// and not something someone will call directly from this library
handlers._users = {};

//compulsory fields: firstName lastName phone password tosAgreement

//_users post
handlers._users.post = function(data,callback){
	//check that payload has all fields
	var firstName = typeof(data.payload.firstName)=='string' && data.payload.firstName.trim().length>0 ? data.payload.firstName.trim() : false;
	var lastName = typeof(data.payload.lastName)=='string' && data.payload.lastName.trim().length>0 ? data.payload.lastName.trim() : false;
	var phone = typeof(data.payload.phone)=='string' && data.payload.phone.trim().length==10 ? data.payload.phone.trim() : false;
	var password = typeof(data.payload.password)=='string' && data.payload.password.trim().length>0 ?data.payload.password.trim():false;
	var tosAgreement = typeof(data.payload.tosAgreement)=='boolean' && data.payload.tosAgreement==true ? true :false;
	
	if(firstName && lastName && phone && password && tosAgreement){
		//make sure he does not exist
		_data.read('users',phone,function(err,data){
			if(err){
				//hash the password
				var hashedPassword = helpers.hash(password);

				// making user object only if password got hashed
				if(hashedPassword){
					var userObject = {
						'firstName' : firstName,
						'lastName' : lastName,
						'phone' : phone,
						'hashedPassword' : hashedPassword
					};

				//store the user on disk
					_data.create('users',phone,userObject, function(err){
						if(!err){
							callback(200);
						} else {
							console.log(err);
							callback(500,{'error':'cannot create new user'});
						}
					});
				} else {
					callback(500,{'error':'cannot hash password'});
				}

			} else {
				callback(400,{'error':'phone no. already exists'});
			}
		});
	} else {
		callback(400,{'error':'missing compulsory fields'});
	}

};


//_users get
// compulsory data is phone
// ONLY LET USERS ACCESS THEIR OWN DATA
handlers._users.get = function(data,callback){
	//get has no payload
	var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ?data.queryStringObject.phone.trim():false;
	if(phone){

		//get the token from the header
		var token = typeof(data.headers.token)=='string' ? data.headers.token: false;

		//verify the token

		handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
			if(tokenIsValid){
				//check if user exists
				_data.read('users',phone,function(err,data){
					if(!err && data){
						//remove hashed password
						delete data.hashedPassword;
						callback(200,data);
						//this is data returned by read function
					} else{
						callback(404) ;
					}
				});
			} else {
				callback(403,{'error':'missing or invalid token in header'});
			}
		});

	} else{
		callback(400, {"error":"missing phone number"})
	}
};

//_users put 
//compulsory is phone where to update
//optional is firstName lastName password ( at least one ) which to update
// ONLY LET USERS UPDATE THEIR OWN DATA
handlers._users.put = function(data,callback){
	var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ?data.payload.phone.trim():false;
	//optional fields
	var firstName = typeof(data.payload.firstName)=='string' && data.payload.firstName.trim().length>0 ? data.payload.firstName.trim() : false;
	var lastName = typeof(data.payload.lastName)=='string' && data.payload.lastName.trim().length>0 ? data.payload.lastName.trim() : false;
	var password = typeof(data.payload.password)=='string' && data.payload.password.trim().length>0 ?data.payload.password.trim():false;
	//phone compulsory valid
	if(phone){
		if(firstName || lastName|| password){

			//get token
			var token = typeof(data.headers.token)=='string' ? data.headers.token: false;

			//verify the token

			handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
				if(tokenIsValid){
					//lookup if user exists
					_data.read('users',phone,function(err,userData){
						if(!err && userData){

							if(firstName){
								userData.firstName = firstName;
							}
							if(lastName){
								userData.lastName = lastName;
							}
							if(password){
								userData.hashedPassword = helpers.hash(password);
							}
							//make storage persistent
							_data.update('users',phone,userData,function(err){
								if(!err){
									callback(200);
								} else {
									console.log(err);
									callback(500,{'errror':'server cannot update user'})
								}
							});

						} else{
							callback(400, {"error":"user does not exist"});
						}	
					});

				} else {
					callback(403,{'error':'missing or invalid token in header'});
				}
			});

		} else{
			callback(400, {"error":"missing field to update"});

		}
	} else {
		callback(400, {"error":"missing phone number"})

	}
};


//_users delete
//only delete own account
//cleanup all users files
handlers._users.delete = function(data,callback){
  // Check that phone number is valid
  var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
  if(phone){

	//get token
	var token = typeof(data.headers.token)=='string' ? data.headers.token: false;

	//verify the token

	handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
		if(tokenIsValid){

			// Lookup the user
		    _data.read('users',phone,function(err,userData){
		      if(!err && userData){
		        _data.delete('users',phone,function(err){
		          if(!err){
		          	//delete all related checks
		          	var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
		          	var checksToDelete = userChecks.length;

		          	if(checksToDelete>0){
		          		var checksDeleted = 0;
		          		var deletionErrors = false;

		          		//loop all checks
		          		userChecks.forEach(function(checkId){
		          			_data.delete('checks',checkId,function(err){
		          				if(err){
		          					deletionErrors = true;
		          				} 
		          				checksDeleted++;
		          				if(checksDeleted == checksToDelete){
		          					if(!deletionErrors){
		          						callback(200);
		          					} else {
		          						callback(500,{'error':'problem attempting to delete checks'});
		          					}

		          				}
		          			});
		          		});
		          	} else{
		          		callback(200);
		          	}
		          } else {
		            callback(500,{'Error' : 'Could not delete the specified user'});
		          }
		        });
		      } else {
		        callback(400,{'Error' : 'Could not find the specified user.'});
		      }
		    });

		} else {
			callback(403,{'error':'missing or invalid token in header'});
		}
	});
  } else {
    callback(400,{'Error' : 'Missing required field'})
  }
};


//define tokens
handlers.tokens = function(data,callback){
	//we don't accept any other methods in this route
	var acceptableMethods = ['','get','post','put','delete'];
	if(acceptableMethods.indexOf(data.method)){
		handlers._tokens[data.method](data,callback);
	} else{
		callback(405);
	}
};

//container for private tokens
handlers._tokens = {};

//post tokens
//compulsory data phone and password
handlers._tokens.post = function (data , callback){
	var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ?data.payload.phone.trim():false;
	var password = typeof(data.payload.password)=='string' && data.payload.password.trim().length>0 ?data.payload.password.trim():false;
	if(phone && password){
		//find that user
		_data.read('users',phone,function(err,userData){
			if(!err && userData){
				//hash and compare
				var hashedPassword = helpers.hash(password);
				if(hashedPassword == userData.hashedPassword){
					//make a tokens which expires in 1hr
					var tokenId = helpers.createRandomString(20);
					var expires = Date.now() + 1000*60*60;

					var tokenObject = {
						'phone' : phone,
						'tokenId' : tokenId,
						'expires' : expires
					};

					//store the tokens
					_data.create('tokens',tokenId,tokenObject,function(err){
						if(!err){
							callback(200,tokenObject);
						} else {
							callback(500,{'error':'cannot create the tokens'})
						}
					});
				} else{
					callback(400,{'error':'password did not match'});
				}
			} else {
				callback(400,{'error':'cannot find the phone'});
			}
		});
	} else {
		callback(400, {'error':'missing phone or password'});
	}
};

//get tokens
//compulsory is id
handlers._tokens.get = function (data , callback){
  var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 19 ?data.queryStringObject.id.trim():false;
	if(id){
		//check if user exists
		_data.read('tokens',id,function(err,tokenData){
			if(!err && tokenData){
				callback(200,tokenData);
			} else{
				callback(404) ;
			}
		})
	} else{
		callback(400, {"error":"missing id"})
	}
};

//put tokens
//compulsory id and extend keep a boolean to increase time by fixed amount
handlers._tokens.put = function (data , callback){
	var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 19 ?data.payload.id.trim():false;
	var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true :false;
	
	if(id && extend){
		_data.read('tokens',id,function(err,tokenData){
			if(!err && tokenData){
				//check tokens not expires
				if(tokenData.expires > Date.now()){ 
					//set one hour more 
					tokenData.expires = Date.now() + 1000*60*60;
					
					_data.update('tokens',id,tokenData,function(err){
						if(!err){
							callback(200);
						} else{
							callback(500,{'error':'could not update the expires'})
						}
					});
				} else {
					callback(400,{'error':'tokens has already expires'});
				}
			} else {
				callback(400,{'error':'tokens not found'});
			}
		});
	} else {
		callback(400,{'error':'wrong id or extend'});
	}
};

//delete tokens
// compulsory is id
handlers._tokens.delete = function (data , callback){
	// Check that id is valid
  var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 19 ?data.queryStringObject.id.trim():false;
    if(id){
	    // Lookup the tokens
	    _data.read('tokens',id,function(err,data){
	      if(!err && data){
	        _data.delete('tokens',id,function(err){
	          if(!err){
	            callback(200);
	          } else {
	            callback(500,{'Error' : 'Could not delete the specified tokens'});
	          }
	        });
	      } else {
	        callback(400,{'Error' : 'Could not find the specified tokens.'});
	      }
	    });
    } else {
        callback(400,{'Error' : 'Missing required parameter'})
  }
};

//verify if tokenId is valid for a user
handlers._tokens.verifyToken= function(id,phone,callback){
	//lookup
	_data.read('tokens',id,function(err,tokenData){
		if(!err && tokenData){
			if(tokenData.phone == phone && tokenData.expires>Date.now()){
				callback(true);
			} else {
				callback(false);
			}
		} else {
			callback(false)
		}
	});
};


//define checks
handlers.checks = function(data,callback){
	//we don't accept any other methods in this route
	var acceptableMethods = ['','get','post','put','delete'];
	if(acceptableMethods.indexOf(data.method)){
		handlers._checks[data.method](data,callback);
	} else{
		callback(405);
	}
};

//container for all checks methods
handlers._checks = {};

//checks post
//compulsory protocol, url, method, successCodes, timeoutSeconds

handlers._checks.post = function(data,callback){
	//validate inputs
	var protocol = typeof(data.payload.protocol) == 'string' && ['http','https'].indexOf(data.payload.protocol.trim().toLowerCase()) > -1 ? data.payload.protocol.trim().toLowerCase() : false;
	var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
	var method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method.trim().toLowerCase()) > -1 ? data.payload.method.trim().toLowerCase : false;
	var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length >0 ? data.payload.successCodes : false;
	var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 ===0  && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

	if(protocol && url&&method&&successCodes&&timeoutSeconds){
		//get token and verify it
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

		//check the user from the token
		_data.read('tokens',token,function(err,tokenData){
			if(!err && tokenData){
				var userPhone = tokenData.phone;
				//lookup user
				_data.read('users',userPhone,function(err,userData){
					if(!err && userData){
						var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
						//verify maxChecks 
						if(userChecks.length<config.maxChecks){
							//make a random id for the checks
							var checkId = helpers.createRandomString(20);

							//check object with phone
							var checkObject = {
								'id' : checkId,
								'userPhone' : userPhone,
								'protocol' : protocol,
								'url' : url ,
								'method' : method,
								'successCodes' : successCodes,
								'timeoutSeconds' : timeoutSeconds
							};

							//save this object
							_data.create('checks',checkId,checkObject,function(err){
								if(!err){
									//add checkId to userData
									userData.checks = userChecks;
									userData.checks.push(checkId);

									//save the new userData
									_data.update('users',userPhone,userData,function(err){
										if(!err){
											//return new check data to requester
											callback(200,checkObject);
										} else {
											callback(500,{'error':'cannot update user with new check'});
										}
									});
								} else {
									callback(500,{'error':'cannot create the new check'})
								}
							});
						} else {
							callback(400,{'error':'maxChecks is '+ config.maxChecks + ' per user'});
						}
					} else {
						callback(403);
					}
				});
			} else {
				callback(403)
			}
		});
	} else {
		callback(400,{'error':'missing or invalid check inputs'});
	}

};


//get checks
//compulsory id in queryStringObject
handlers._checks.get = function(data,callback){
	//get has no payload
	var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 19 ?data.queryStringObject.id.trim():false;
	if(id){
		//lookup who made the checks and whose is it
		_data.read('checks',id,function(err,checkData){
			if(!err && checkData){
				//get the token from the header
				var token = typeof(data.headers.token)=='string' ? data.headers.token: false;

				//verify the token is valid and belongs to user who made the check
				handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
					if(tokenIsValid){
						//give user the check data
						callback(200,checkData);
					} else {
						callback(403,{'error':'missing or invalid token in header'});
					}
				});

			} else {
				callback(404)
			}
		});
	} else{
		callback(400, {"error":"missing id for checks"});
	}
};


//check put
//id is compulsory and any other one they have to send which they want to change
handlers._checks.put= function(data, callback){
	//compulsory field
	var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 19 ?data.payload.id.trim():false;
	
	var protocol = typeof(data.payload.protocol) == 'string' && ['http','https'].indexOf(data.payload.protocol.trim().toLowerCase()) > -1 ? data.payload.protocol.trim().toLowerCase() : false;
	var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
	var method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method.trim().toLowerCase()) > -1 ? data.payload.method.trim().toLowerCase : false;
	var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length >0 ? data.payload.successCodes : false;
	var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 ===0  && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

	//id is valid
	if(id){
		//one of the optional fields
		if(protocol || url || method  || successCodes || timeoutSeconds){
			//lookup the check
			_data.read('checks',id,function(err , checkData){
				if(!err &&checkData){
					//get the token from the header
					var token = typeof(data.headers.token)=='string' ? data.headers.token: false;

					//verify the token is valid and belongs to user who made the check
					handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
						if(tokenIsValid){
							//update check
							if(protocol){
								checkData.protocol = protocol;
							}
							if(url){
								checkData.url = url;
							}
							if(method){
								checkData.method = method;
							}
							if(successCodes){
								checkData.successCodes = successCodes;
							}
							if(timeoutSeconds){
								checkData.timeoutSeconds = timeoutSeconds;
							}

							//store the updates
							_data.update('checks',id,checkData,function(err){
								if(!err){
									callback(200);
								} else {
									callback(500,{'error':'cannot update the check'})
								}
							});
						} else {
							callback(403,{'error':'missing or invalid token in header'});
						}
					});
				} else {
					callback(400,{'error':'checkId not found'});
				}
			});
		} else {
			callback(400, {"error":"missing fields for update checks"});
		}
	} else{
		callback(400, {"error":"missing id for checks"});
	}

};


//checks delete with id
handlers._checks.delete = function(data,callback){
  // Check that phone number is valid
  var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 19 ? data.queryStringObject.id.trim() : false;
  if(id){

  	//lookup the check
  	_data.read('checks',id,function(err , checkData){
		if(!err &&checkData){

			//get token
			var token = typeof(data.headers.token)=='string' ? data.headers.token: false;

			//verify the token

			handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
				if(tokenIsValid){
					//delete that check
					_data.delete('checks',id,function(err){
						if(!err){
							// Lookup the user
						    _data.read('users',checkData.userPhone,function(err,userData){
						        if(!err && userData){
						        	//what are his checks
									var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

									//remove the deleted check from their list of checks
									var checkPosition  = userChecks.indexOf(id);
									if(checkPosition>-1){
										userChecks.splice(checkPosition,1);
										//save the update
										_data.update('users',checkData.userPhone,userData,function(err){
									        if(!err){
									            callback(200);
									        } else {
									            callback(500,{'Error' : 'Could not update the user'});
									        }
									    });
									} else {
										callback(500,{'Error' : 'Could not find check on user so could not remove it'});
									}
							        
						        } else {
						        	callback(500,{'Error' : 'Could not find user who made the check'});
						        }
						    });
						} else {
							callback(500,{'error':'cannot delete the check'});
						}
					});
				} else {
					callback(403,{'error':'missing or invalid token in header'});
				}
			});



		}else{
			callback(400,{'error':'checkId not found'})
		}
	});


  } else {
    callback(400,{'Error' : 'Missing required field'})
  }
};


//ping service
handlers.ping = function(data, callback){
	callback(200);
};

//not found handlers
handlers.notFound = function(data, callback){
	//callback has a http code and payload
	callback(404);
};

module.exports = handlers;
