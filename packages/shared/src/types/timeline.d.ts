export declare enum TimelineEventType {
    StatusChange = "status_change",
    InterviewScheduled = "interview_scheduled",
    FeedbackSubmitted = "feedback_submitted",
    OfferGenerated = "offer_generated",
    RejectionRecorded = "rejection_recorded",
    ApplicationSubmitted = "application_submitted"
}
export interface TimelineEvent {
    id: string;
    candidateId: string;
    eventType: TimelineEventType;
    previousStatus?: string | null;
    newStatus?: string | null;
    details?: string | null;
    actorId?: string | null;
    createdAt: string;
}
