"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATE_TRANSITIONS = exports.TERMINAL_STATUSES = exports.REJECTABLE_STATUSES = exports.VALID_TRANSITIONS = exports.VALID_FORWARD_TRANSITIONS = void 0;
exports.getValidTransitions = getValidTransitions;
exports.isValidTransition = isValidTransition;
exports.isTerminalStatus = isTerminalStatus;
const candidate_1 = require("../types/candidate");
exports.VALID_FORWARD_TRANSITIONS = {
    [candidate_1.CandidateStatus.Applied]: [candidate_1.CandidateStatus.FormSubmitted],
    [candidate_1.CandidateStatus.FormSubmitted]: [candidate_1.CandidateStatus.InterviewScheduled],
    [candidate_1.CandidateStatus.InterviewScheduled]: [candidate_1.CandidateStatus.OfferSent],
    [candidate_1.CandidateStatus.OfferSent]: [candidate_1.CandidateStatus.Hired],
    [candidate_1.CandidateStatus.Hired]: [],
    [candidate_1.CandidateStatus.Rejected]: [],
};
exports.VALID_TRANSITIONS = {
    [candidate_1.CandidateStatus.Applied]: [candidate_1.CandidateStatus.FormSubmitted, candidate_1.CandidateStatus.Rejected],
    [candidate_1.CandidateStatus.FormSubmitted]: [candidate_1.CandidateStatus.InterviewScheduled, candidate_1.CandidateStatus.Rejected],
    [candidate_1.CandidateStatus.InterviewScheduled]: [candidate_1.CandidateStatus.OfferSent, candidate_1.CandidateStatus.Rejected],
    [candidate_1.CandidateStatus.OfferSent]: [candidate_1.CandidateStatus.Hired, candidate_1.CandidateStatus.Rejected],
    [candidate_1.CandidateStatus.Hired]: [],
    [candidate_1.CandidateStatus.Rejected]: [],
};
exports.REJECTABLE_STATUSES = [
    candidate_1.CandidateStatus.Applied,
    candidate_1.CandidateStatus.FormSubmitted,
    candidate_1.CandidateStatus.InterviewScheduled,
    candidate_1.CandidateStatus.OfferSent,
];
exports.TERMINAL_STATUSES = [
    candidate_1.CandidateStatus.Hired,
    candidate_1.CandidateStatus.Rejected,
];
function getValidTransitions(status) {
    return exports.VALID_TRANSITIONS[status] ?? [];
}
function isValidTransition(from, to) {
    return exports.VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
exports.STATE_TRANSITIONS = exports.VALID_TRANSITIONS;
function isTerminalStatus(status) {
    return exports.TERMINAL_STATUSES.includes(status);
}
//# sourceMappingURL=pipeline.js.map