app.factory('caseService', ['$q', '$log', 'sfrquery', function ($q,$log,sfrquery) {
	
	var caseService = {
		_cases: [],
		_patient: {
			Id: '003o0000003OB00'
		},
		_patientId: '003o0000003OB00',
		//Methods
		
		setPatient: function(patient){
			_patient = patient;
		},
		getCases: function(){
			var pGetCases = sfrquery.query(caseService.getCasesForPatientQuery());
			pGetCases.then(caseService.setListOfCases);
		},
		setListOfCases: function(data){
			caseService._cases = data;
		},
		getCasesForPatientQuery: function() {
			//@todo make sure _patient is valid
			return "SELECT Id, CaseNumber, priority, Description FROM Case WHERE contactId = '" + caseService._patient.Id + "'";
		},
		getHighPriorityCases: function() {
			return _.where(caseService._cases, function(caseitem){
				return (caseitem.Priority == 'High');
			});
		}
	};
	return caseService;
}]);