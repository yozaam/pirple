//workers related tasks

//dependencies
const path = require('path');
const fs = require('fs');
const _data = require('./data');
const https = require('https');
const http = require('http');
const helpers = require('./helpers');
const url  = require('url');

var workers = {};

//lookup all checks and send to a validator
workers.gatherAllChecks= function(){
	//get all checks
	_data.list('checks',function(err,checks){
		if(!err && checks && checks>0){
			checks.forEach(function(check){
				//read the check
				_data.read('checks',check,function(err,originalCheckData){
					if(!err && originalCheckData) {
						//pass data to validateCheckData
						workers.validateCheckData(originalCheckData) ;
					} else {
						console.log('error reading one of the checks');
					}
				});
			});
		} else{
			console.log('error could not find any checks to process');
		}
	});
};

//sanity check
workers.validateCheckData = function(originalCheckData){
	originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {};
	originalCheckData.id = 
};


//timer to execute once a minute
workers.loop = function(){
	setInterval(function(){
		workers.gatherAllChecks();
	},1000*60);
};



workers.init = function(){
	//execute all checks ( because the loop uses a setInterval so it will not start immediately)
	workers.gatherAllChecks();
	//loop to continue executing checks
	workers.loop();
};

module.exports = workers;