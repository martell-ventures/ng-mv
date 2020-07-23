(function() {
	var module= angular.module('mv.banking.numbers.iban', []);

	// move to mv-ng
	module.factory('ibanProvider', ['$q', function($q) {
		// see https://bfsfcu.org/pdf/IBAN.pdf
		// placeholders from http://www.xe.com/ibancalculator/countrylist/
		// FIXME: retrieve this information from the server (Validation->ibanDataTable())
		function ibanFieldsForCountryCode(countryCode) {
			var fields;

			// The BBAN format column shows the format of the BBAN part of an IBAN in terms of upper case alpha characters (A–Z) denoted by "a",
			// numeric characters (0–9) denoted by "n"
			// and mixed case alphanumeric characters (a–z, A–Z, 0–9) denoted by "c".
			// For example, the Bulgarian BBAN (4a,6n,8c) consists of 4 alpha characters, followed by 6 numeric characters, then by 8 mixed-case
			// alpha-numeric characters. Descriptions in the Comments field have been standardised with country specific names in brackets.
			// The format of the various fields can be deduced from the BBAN field.
			switch(countryCode) {
			case 'AL': // Albania
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}\\d{8}[A-Za-z0-9]{16}", // 8n,16c
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 10 digits, and then 16 numbers or characters.",
					maxLength: 28,
					placeholder: "AL47212110090000000235698741"
				};
				break;
			case 'AD': // Andorra
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}\\d{8}[A-Za-z0-9]{12}", // 8n,12c
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 10 digits and then 12 numbers or characters.",
					maxLength: 24,
					placeholder: "AD1200012030200359100100"
				};
				break;
			case 'AT': // Austria
				fields = {
					pattern: "[A-Za-z]{2}\\d{18}", // 16n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 18 digits.",
					maxLength: 20,
					placeholder: "AT611904300234573201"
				};
				break;
			case 'AZ': // Azerbaijan
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}[A-Za-z0-9]{4}\\d{20}", // 4c,20n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 2 digits, then 4 characters, and finally 20 digits.",
					maxLength: 28,
					placeholder: "AZ21NABZ00000000137010001944"
				};
				break;
			case 'BH': // Bahrain
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}[A-Za-z]{4}[A-Za-z0-9]{14}", // 4a,14c
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 2 digits, then 4 characters, and finally 14 numbers or characters.",
					maxLength: 22,
					placeholder: "BH67BMAG00001299123456"
				};
				break;
			case 'BE': // Belgium
				fields = {
					pattern: "[A-Za-z]{2}\\d{14}", // 12n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 14 digits.",
					maxLength: 16,
					placeholder: "BE68539007547034"
				};
				break;
			case 'BA': //Bosnia and Herzegovina
				fields = {
					pattern: "[A-Za-z]{2}\\d{18}", // 16n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 18 digits.",
					maxLength: 20,
					placeholder: "BA391290079401028494"
				};
				break;
			case 'BR': //Brazil
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}\\d{23}[A-Za-z]{1}[A-Za-z0-9]{1}", // 23n, 1a, 1c
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 25 digits, a letter and then a number or letter.",
					maxLength: 29,
					placeholder: "BR9700360305000010009795493P1"
				};
				break;
			case 'BG': //Bulgaria
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}[A-Za-z]{4}\\d{6}[A-Za-z0-9]{8}", // 4a,6n,8c
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 18 digits.",
					maxLength: 22,
					placeholder: "BG80BNBG96611020345678"
				};
				break;
			case 'CR': // Costa Rica
				fields = {
					pattern: "[A-Za-z]{2}\\d{20}", // 17n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 20 digits.",
					maxLength: 22,
					placeholder: "CR05015202001026284066"
				};
				break;
			case 'HR': // Croatia
				fields = {
					pattern: "[A-Za-z]{2}\\d{19}", // 17n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 19 digits.",
					maxLength: 21,
					placeholder: "HR1210010051863000160"
				};
				break;
			case 'CY': // Cyprus
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}\\d{8}[A-Za-z0-9]{16}", // 8n,16c
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 10 digits, then 16 letters or digits.",
					maxLength: 28,
					placeholder: "CY17002001280000001200527600"
				};
				break;
			case 'CZ': // Czech Republic
				fields = {
					pattern: "[A-Za-z]{2}\\d{22}", // 8n,16c
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 22 digits.",
					maxLength: 24,
					placeholder: "CZ6508000000192000145399"
				};
				break;
			case 'DK': // Denmark
				fields = {
					pattern: "[A-Za-z]{2}\\d{16}", // 14n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 16 digits.",
					maxLength: 18,
					placeholder: "DK5000400440116243"
				};
				break;
			case 'DO': // Dominican Republic
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}[A-Za-z]{4}\\d{20}", // 4a,20n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 2 digits, then 4 letters and finally 20 letters or numbers.",
					maxLength: 28,
					placeholder: "DO28BAGR00000001212453611324"
				};
				break;
			case 'EE': // Estonia
				fields = {
					pattern: "[A-Za-z]{2}\\d{18}", // 16n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 18 digits.",
					maxLength: 20,
					placeholder: "EE382200221020145685"
				};
				break;
			case 'FO': // Faroe Islands[Note 4]
				fields = {
					pattern: "[A-Za-z]{2}\\d{16}", // 14n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 16 digits.",
					maxLength: 18,
					placeholder: "FO6264600001631634"
				};
				break;
			case 'FI': // Finland
				fields = {
					pattern: "[A-Za-z]{2}\\d{16}", // 14n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 16 digits.",
					maxLength: 18,
					placeholder: "FI2112345600000785"
				};
				break;
			case 'FR': // France
				fields = {
					pattern: "[A-Za-z]{2}\\d{12}[A-Za-z0-9]{11}\\d{2}", // 10n,11c,2n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 12 digits, then 11 letters or digits and finally 2 digits.",
					maxLength: 27,
					placeholder: "FR1420041010050500013M02606"
				};
				break;
			case 'GE': // Georgia
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}[A-Za-z0-9]{2}\\d{16}", // 2c,16n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 2 digits, then 2 letters or digits and finally 16 digits.",
					maxLength: 22,
					placeholder: "GE29NB0000000101904917"
				};
				break;
			case 'DE': // Germany
				fields = {
					pattern: "[A-Za-z]{2}\\d{20}", // 18n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 20 digits.",
					maxLength: 22,
					placeholder: "DE89370400440532013000"
				};
				break;
			case 'GI': // Gibraltar
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}[A-Za-z]{4}[A-Za-z0-9]{15}", // 4a,15c
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 2 digits, then 4 letters and then 15 numbers or letters.",
					maxLength: 23,
					placeholder: "GI75NWBK000000007099453"
				};
				break;
			case 'GR': // Greece
				fields = {
					pattern: "[A-Za-z]{2}\\d{9}[A-Za-z0-9]{16}", // 7n,16c
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 9 digits, then 16 letters or digits.",
					maxLength: 27,
					placeholder: "GR1601101250000000012300695"
				};
				break;
			case 'GL': // Greenland
				fields = {
					pattern: "[A-Za-z]{2}\\d{16}", // 14n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 16 digits.",
					maxLength: 18,
					placeholder: "GL8964710001000206"
				};
				break;
			case 'GT': // Guatemala
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}[A-Za-z0-9]{20}", // 4c,20c
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 2 digits, then 24 letters or numbers.",
					maxLength: 28,
					placeholder: "GT82TRAJ01020000001210029690"
				};
				break;
			case 'HU': // Hungary
				fields = {
					pattern: "[A-Za-z]{2}\\d{26}", // 24n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 26 digits.",
					maxLength: 28,
					placeholder: "HU42117730161111101800000000"
				};
				break;
			case 'IS': // Iceland
				fields = {
					pattern: "[A-Za-z]{2}\\d{24}", // 22n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 24 digits.",
					maxLength: 26,
					placeholder: "IS140159260076545510730339"
				};
				break;
			case 'IE': // Ireland
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}[A-Za-z0-9]{4}\\d{14}", // 4c,14n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 2 digits, then 4 letters or numbers, and finally 14 digits.",
					maxLength: 22,
					placeholder: "IE29AIBK93115212345678"
				};
				break;
			case 'IL': // Israel
				fields = {
					pattern: "[A-Za-z]{2}\\d{21}", // 19n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 21 digits.",
					maxLength: 23,
					placeholder: "IL620108000000099999999"
				};
				break;
			case 'IT': // Italy
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}[A-Za-z]{1}\\d{10}[A-Za-z0-9]{12}", // 1a,10n,12c
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 2 digits, then a letter, then 10 digits, and finally 12 letters or numbers.",
					maxLength: 27,
					placeholder: "IT60X0542811101000000123456"
				};
				break;
			case 'KZ': // Kazakhstan
				fields = {
					pattern: "[A-Za-z]{2}\\d{5}[A-Za-z0-9]{13}", // 3n,13c
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 5 digits, and then 13 letters or numbers.",
					maxLength: 20,
					placeholder: "KZ86125KZT5004100100"
				};
				break;
			case 'KW': // Kuwait
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}[A-Za-z]{4}[A-Za-z0-9]{22}", // 4a, 22c
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 2 digits, and then 4 letters and finally 22 letters or digits.",
					maxLength: 30,
					placeholder: "KW81CBKU0000000000001234560101"
				};
				break;
			case 'LV': // Latvia
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}[A-Za-z]{4}[A-Za-z0-9]{13}", // 4a, 13c
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 2 digits, and then 4 letters and finally 13 letters or digits.",
					maxLength: 21,
					placeholder: "LV80BANK0000435195001"
				};
				break;
			case 'LB': // Lebanon
				fields = {
					pattern: "[A-Za-z]{2}\\d{6}[A-Za-z0-9]{20}", // 4n,20c
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 6 digits, and then 20 letters or digits.",
					maxLength: 28,
					placeholder: "LB62099900000001001901229114"
				};
				break;
			case 'LI': // Liechtenstein
				fields = {
					pattern: "[A-Za-z]{2}\\d{7}[A-Za-z0-9]{12}", // 5n,12c
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 7 digits, and then 12 letters or digits.",
					maxLength: 21,
					placeholder: "LI21088100002324013AA"
				};
				break;
			case 'LT': // Lithuania
				fields = {
					pattern: "[A-Za-z]{2}\\d{18}", // 16n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 18 digits.",
					maxLength: 20,
					placeholder: "LT121000011101001000"
				};
				break;
			case 'LU': // Luxembourg
				fields = {
					pattern: "[A-Za-z]{2}\\d{5}[A-Za-z0-9]{13}", // 3n,13c
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 5 digits and then 13 numbers or letters.",
					maxLength: 20,
					placeholder: "LU280019400644750000"
				};
				break;
			case 'MK': // Macedonia
				fields = {
					pattern: "[A-Za-z]{2}\\d{5}[A-Za-z0-9]{10}\\d{2}", // 3n,10c,2n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 5 digits and then 10 numbers or letters, and finally two digits.",
					maxLength: 19,
					placeholder: "MK07250120000058984"
				};
				break;
			case 'MT': // Malta
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}[A-Za-z]{4}\\d{5}[A-Za-z0-9]{18}", // 4a,5n,18c
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 2 digits, then 4 letters,  then 5 digits, and finally 18 numbers or letters.",
					maxLength: 31,
					placeholder: "MT84MALT011000012345MTLCAST001S"
				};
				break;
			case 'MR': // Mauritania
				fields = {
					pattern: "[A-Za-z]{2}\\d{25}", // 23n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 25 digits.",
					maxLength: 27,
					placeholder: "MR1300020001010000123456753"
				};
				break;
			case 'MU': // Mauritius
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}[A-Za-z]{4}\\d{19}[A-Za-z]{3}", // 4a,19n,3a
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 2 digits, then 4 letters, 19 numbers, and finally 3 letters.",
					maxLength: 30,
					placeholder: "MU17BOMM0101101030300200000MUR"
				};
				break;
			case 'MC': // Monaco
				fields = {
					pattern: "[A-Za-z]{2}\\d{12}[A-Za-z0-9]{11}\\d{2}", // 10n,11c,2n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 12 digits, then 11 letters or numbers and finally 2 digits.",
					maxLength: 27,
					placeholder: "MC5811222000010123456789030"
				};
				break;
			case 'MD': // Moldova
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}[A-Za-z0-9]{2}\\d{18}", // 2c,18n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 2 digits, then 2 letters or numbers and finally 18 digits.",
					maxLength: 24,
					placeholder: "MD24AG000225100013104168"
				};
				break;
			case 'ME': // Montenegro
				fields = {
					pattern: "[A-Za-z]{2}\\d{20}", // 18n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 20 digits.",
					maxLength: 22,
					placeholder: "ME25505000012345678951"
				};
				break;
			case 'NL': // Netherlands[Note 6]
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}[A-Za-z]{4}\\d{10}", // 4a,10n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 2 digits, then 4 letters, and finally 10 digits.",
					maxLength: 18,
					placeholder: "NL91ABNA0417164300"
				};
				break;
			case 'NO': // Norway
				fields = {
					pattern: "[A-Za-z]{2}\\d{13}", // 11n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 13 digits.",
					maxLength: 15,
					placeholder: "NO9386011117947"
				};
				break;
			case 'PK': // Pakistan
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}[A-Za-z0-9]{4}\\d{16}", // 4c,16n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 2 digits, then 4 letters or numbers, and finally 16 digits.",
					maxLength: 24,
					placeholder: "PK36SCBL0000001123456702"
				};
				break;
			case 'PS': // Palestine
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}[A-Za-z0-9]{4}\\d{21}", // 4c,21n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 2 digits, then 4 letters or numbers, and finally 21 digits.",
					maxLength: 29,
					placeholder: "PS92PALS000000000400123456702"
				};
				break;
			case 'PL': // Poland
				fields = {
					pattern: "[A-Za-z]{2}\\d{26}", // 24n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 26 digits.",
					maxLength: 28,
					placeholder: "PL61109010140000071219812874"
				};
				break;
			case 'PT': // Portugal
				fields = {
					pattern: "[A-Za-z]{2}\\d{23}", // 21n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 23 digits.",
					maxLength: 25,
					placeholder: "PT50000201231234567890154"
				};
				break;
			case 'RO': // Romania
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}[A-Za-z]{4}[A-Za-z0-9]{16}", // 4a,16c
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 2 digits, then 4 letters, and finally 16 letters or digits.",
					maxLength: 24,
					placeholder: "RO49AAAA1B31007593840000"
				};
				break;
			case 'SM': // San Marino
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}[A-Za-z]{1}\\d{10}[A-Za-z0-9]{12}", // 1a,10n,12c
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 2 digits, then 1 letter, then 10 digits, then finally 12 letters or digits.",
					maxLength: 27,
					placeholder: "SM86U0322509800000000270100"
				};
				break;
			case 'SA': // Saudi Arabia
				fields = {
					pattern: "[A-Za-z]{2}\\d{4}[A-Za-z0-9]{18}", // 2n,18c
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 4 digits, then 18 letters or digits.",
					maxLength: 24,
					placeholder: "SA0380000000608010167519"
				};
				break;
			case 'RS': // Serbia
				fields = {
					pattern: "[A-Za-z]{2}\\d{20}", // 18n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 20 digits.",
					maxLength: 22,
					placeholder: "RS35260005601001611379"
				};
				break;
			case 'SK': // Slovakia
				fields = {
					pattern: "[A-Za-z]{2}\\d{22}", // 20n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 22 digits.",
					maxLength: 24,
					placeholder: "SK3112000000198742637541"
				};
				break;
			case 'SI': // Slovenia
				fields = {
					pattern: "[A-Za-z]{2}\\d{17}", // 15n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 17 digits.",
					maxLength: 19,
					placeholder: "SI56263300012039086"
				};
				break;
			case 'ES': // Spain
				fields = {
					pattern: "[A-Za-z]{2}\\d{22}", // 20n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 22 digits.",
					maxLength: 24,
					placeholder: "ES9121000418450200051332"
				};
				break;
			case 'SE': // Sweden
				fields = {
					pattern: "[A-Za-z]{2}\\d{22}", // 20n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 22 digits.",
					maxLength: 24,
					placeholder: "SE4550000000058398257466"
				};
				break;
			case 'CH': // Switzerland
				fields = {
					pattern: "[A-Za-z]{2}\\d{7}[A-Za-z0-9]{12}", // 5n,12c
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 7 digits, and then 12 letters or numbers.",
					maxLength: 21,
					placeholder: "CH9300762011623852957"
				};
				break;
			case 'TN': // Tunisia
				fields = {
					pattern: "[A-Za-z]{2}\\d{22}", // 20n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 22 digits.",
					maxLength: 24,
					placeholder: "TN5910006035183598478831"
				};
				break;
			case 'TR': // Turkey
				fields = {
					pattern: "[A-Za-z]{2}\\d{7}[A-Za-z0-9]{17}", // 5n,17c
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 7 digits, then 17 letters or numbers.",
					maxLength: 26,
					placeholder: "TR330006100519786457841326"
				};
				break;
			case 'AE': // UAE
				fields = {
					pattern: "[A-Za-z]{2}\\d{21}", // 3n,16n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 21 digits.",
					maxLength: 23,
					placeholder: "AE070331234567890123456"
				};
				break;
			case 'GB': // United Kingdom
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}[A-Za-z]{4}\\d{14}", // 4a,14n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 2 digits, then 4 letters, and then 14 digits.",
					maxLength: 22,
					placeholder: "GB29NWBK60161331926819"
				};
				break;
			case 'VG': // Virgin Islands, British
				fields = {
					pattern: "[A-Za-z]{2}\\d{2}[A-Za-z0-9]{4}\\d{16}", // 4c,16n
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 2 digits, then 4 letters or numbers, and finally 16 digits.",
					maxLength: 24,
					placeholder: "VG96VPVG0000012345678901"
				};
				break;
			default:
				fields = {
					pattern: "[A-Za-z]{2}\\d{20}",
					description: "This is the IBAN account number.  It should be a two letter country prefix followed by 20 digits.",
					maxLength: 22,
					placeholder: "DE89370400440532013000",
					default: true
				};
			}

			return fields;
		}
		
		return {
			forCountryCode: ibanFieldsForCountryCode,
			countrySupportsIBAN: function(countryCode) {
				var data = ibanFieldsForCountryCode(countryCode);
				return !data.default;
			}
		};
	}]);

	module.directive('ibanNumberForCountry', ['ibanProvider', function(ibanProvider) {
		return {
			restrict: 'A',
			require: 'ngModel',
			link: function($scope, $element, $attr, ngModel) {
				var validationData = null;

				if(!$attr.ibanNumberForCountry) {
					console.log("Country code required");
					return;
				}

				ngModel.$validators.ibanNumberForCountry= function(modelValue, viewValue) {
					if(!validationData) {
						return true; // loading
					}

					var valid= false;
					var value = viewValue || '';
					if(value.length <= validationData.maxLength)
					{
						if(value.match(validationData.pattern))
						{
							valid = true;
						}
					}
					
					if(!$element.prop('required'))
					{
						valid= true;
					}
					
					return valid;
				};

				$scope.$watch($attr.ibanNumberForCountry, function(newValue) {
					if(newValue) {
						validationData = ibanProvider.forCountryCode(newValue);
						if(validationData) {
							$element.attr('placeholder', validationData.placeholder);
							$element.attr('maxlength', validationData.maxLength);
							$element.attr('pattern', validationData.pattern);
							ngModel.$validate();
						}
					}
				});
			}
		};
	}]);

	module.directive('ibanHelpBlockText', ['ibanProvider', function(ibanProvider) {
		return {
			restrict: 'E',
			scope: {
				countryCode: '='
			},
			replace: true,
			template: "<span>{{ data.description }}</span>",
			link: function($scope, $element, $attr) {
				$scope.data = {
					description: ''
				};

				$scope.$watch('countryCode', function(newValue) {
					if(newValue) {
						var data = ibanProvider.forCountryCode(newValue);
						if(data) {
							$scope.data = data;
						}
					}
				});
			}
		};
	}]);
})();
