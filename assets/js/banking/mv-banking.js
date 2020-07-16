(function() {
	var module= angular.module('mv.banking', [
		'mv.widgets',
		'mv.configuration',
		'mv.banking.numbers.iban',
		'mv.banking.numbers.account',
		'mv.banking.numbers.routing',
		'mv.banking.kyc'
	]);
})();
