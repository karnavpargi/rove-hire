"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Recommendation = exports.InterviewStatus = exports.InterviewType = void 0;
var InterviewType;
(function (InterviewType) {
    InterviewType["Screening"] = "Screening";
    InterviewType["Technical"] = "Technical";
})(InterviewType || (exports.InterviewType = InterviewType = {}));
var InterviewStatus;
(function (InterviewStatus) {
    InterviewStatus["Scheduled"] = "Scheduled";
    InterviewStatus["Completed"] = "Completed";
    InterviewStatus["Cancelled"] = "Cancelled";
})(InterviewStatus || (exports.InterviewStatus = InterviewStatus = {}));
var Recommendation;
(function (Recommendation) {
    Recommendation["Hire"] = "Hire";
    Recommendation["NoHire"] = "NoHire";
    Recommendation["Maybe"] = "Maybe";
})(Recommendation || (exports.Recommendation = Recommendation = {}));
//# sourceMappingURL=interview.js.map