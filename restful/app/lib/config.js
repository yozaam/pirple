// Create and Export configuration 	variables

//container for all environments
var environments = {};

//staging object default
environments.staging = {
	'httpPort' : 3000,
	'httpsPort' : 3001,
	'envName' : 'staging',
	'hashingSecret' : 'aSecretKey',
	'maxChecks' : 5,
	'twilio' : {
	    'accountSid' : 'AC674bc4a455c2fee80f0f49a15728cd6a',
	    'authToken' : 'bbb34f2348eafeef91d3e66a4ecc607c',
	    'fromPhone' : '+16672811968'
	}
};

//production object
environments.production = {
	'httpPort' : 5000,
	'httpsPort' : 5001,
	'envName' : 'production',
	'hashingSecret' : 'aSecretKey',
	'maxChecks' : 5,
	'twilio' : {
	    'accountSid' : 'AC674bc4a455c2fee80f0f49a15728cd6a',
	    'authToken' : 'bbb34f2348eafeef91d3e66a4ecc607c',
	    'fromPhone' : '+16672811968'
	}
};

//determine which to export from cmdline
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

//check that the env is one of the environments keys
var environmentToExport = typeof(environments[currentEnvironment])=='object'? environments[currentEnvironment] : environments.staging;

module.exports = environmentToExport;