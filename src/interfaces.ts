export enum MessageProtocols {
	DIRECT = "direct",
	ALL_MACHINES = "all_machines",
	ALL_JOBS = "all_jobs",
	MESSAGE_ERROR = "message_error",
	CONNECT = "connect",
	CONNECT_ERROR = "connect_error",
	STATS = "stats",
}

export enum MessageSubject {
	JOB_IS_AVAILABLE = "job_is_available",
	MACHINE_IS_LOOKING_FOR_JOBS = "machine_is_looking_for_jobs",
	MACHINE_HAS_CHOSEN_A_JOB = "machine_has_chosen_a_job",
	JOB_HAS_ACCEPTED_MACHINES_OFFER = "job_has_accepted_machines_offer",
	JOB_HAS_DECLINED_MACHINES_OFFER = "job_has_declined_machines_offer",
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
	AVAILABLE = "available",
	SELECTED = "selected",
	NOT_ONLINE = "not_online",
}

export interface MachineTabProps {
	type: string
}

export enum MachineStates {
	DISCONNECTED = "disconnected",
	CONNECTED = "connected",
	AVAILABLE = "available",
	UNAVAILABLE = "unavailable",
	PRINTING = "printing",
	PRINT_COMPLETE = "print_complete",
}

export interface MachineProps {
	machineState: MachineStates
	setMachineState: any
	gcode: string
	setGcode: any
	machineType: MachineTypes
	setMachineType: any
}

export interface MachineTypeComponentProps {
	machineType: MachineTypes
	setMachineType: any
}

export interface MachineAgentProps {
	machineState: MachineStates
	machineType: MachineTypes
	gcode: string
	setGcode: any
}

export enum MachineSocketStates {
	CONNECTED = "connected",
	DISCONNECTED = "disconnected",
	SEARCHING = "searching",
}

export enum JobSocketStates {
	CONNECTED = "connected",
	DISCONNECTED = "disconnected",
}

export interface BamStats {
	activeJobs: number
	activeMachines: number
}

export enum MachineTypes {
	UM3E = "UM3E",
	UMS3 = "UMS3",
	PRUSA = "PRUSA",
	DUMMY = "DUMMY",
	NULL = "NULL",
}
