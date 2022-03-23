export enum MessageProtocols {
	DIRECT = "direct",
	ALL_MACHINES = "all-machines",
	ALL_JOBS = "all-jobs",
	MESSAGE_ERROR = "message-error",
}

export enum MessageSubject {
	JOB_AVAILABLE = "job-available"
}

/**
 * The format of a message coming to the broker.
 */
export interface Message {
	fromId: string
	toId: string
	subject: string
	body: any
}

export enum JobAgentStates {
	AVAILABLE = "available"
}