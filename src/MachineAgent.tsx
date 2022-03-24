import { Button, Descriptions, Input, notification, Space, Tag } from "antd"
import React, { FC, Fragment, useEffect, useRef, useState } from "react"
import { io, Socket } from "socket.io-client"
import {
	BamStats,
	MachineAgentProps,
	MachineSocketStates,
	MachineStates,
	Message,
	MessageProtocols,
	MessageSubject,
} from "./interfaces"
import { useInterval } from "./utils/use-interval"

export const MachineAgent: FC<MachineAgentProps> = (props) => {
	// Form vars
	const [key, setKey] = useState<string>("")
	const [group, setGroup] = useState<string>("")
	const [connectBtnDisabled, setConnectBtnDisabled] = useState<boolean>(false)
	// Socket vars
	const [socketState, setSocketState] = useState<MachineSocketStates>(
		MachineSocketStates.DISCONNECTED
	)
	const [socket, setSocket] = useState<Socket | null>(null)
	const [statsInterval, setStatsInterval] = useState<number | null>(null)
	const [stats, setStats] = useState<BamStats>({
		activeJobs: 0,
		activeMachines: 0,
	})
	const [searchInterval, setSearchInterval] = useState<number | null>(null) // Must be greater than the returns interval
	const [jobs, setJobs] = useState<Message[]>([])
	const jobsRef = useRef(jobs)
	jobsRef.current = jobs

	const searchWait = 4000
	const repliesWait = 2000
	const statsWait = 1000

	useEffect(() => {
		if (
			props.machineState == MachineStates.AVAILABLE &&
			socketState == MachineSocketStates.CONNECTED
		) {
			setSearchInterval(searchWait)
		} else {
			setSearchInterval(null)
		}
		if (socketState != MachineSocketStates.DISCONNECTED) {
			setStatsInterval(searchWait)
			setConnectBtnDisabled(true)
		} else {
			setStatsInterval(null)
			setConnectBtnDisabled(false)
		}
	}, [props.machineState, socketState])

	useInterval(() => {
		if (socket) {
			socket.emit(MessageProtocols.STATS)
		}
	}, statsInterval)

	useInterval(() => {
		if (socket && props.machineState == MachineStates.AVAILABLE) {
			console.log("|- MachineAgent: looking for jobs")
			// Go and look for jobs
			const msg: Message = {
				fromId: socket.id,
				toId: "",
				subject: MessageSubject.MACHINE_IS_LOOKING_FOR_JOBS,
				body: {},
			}
			socket.emit(MessageProtocols.ALL_JOBS, msg)
			setTimeout(() => {
				selectJob()
			}, repliesWait)
		}
	}, searchInterval)

	const selectJob = () => {
		// Pick the first job from the list
		if (jobsRef.current.length > 0) {
			const job = jobsRef.current[0]
			const msg: Message = {
				fromId: socket.id,
				toId: job.fromId,
				subject: MessageSubject.MACHINE_HAS_CHOSEN_A_JOB,
				body: {},
			}
			socket.emit(MessageProtocols.DIRECT, msg)
		}
	}

	const connect = () => {
		console.log(`|- MachineAgnet: Access Key: ${key} | Group: ${group}`)
		if (key == "") {
			notification["error"]({
				message: "No Access Key",
				description: "Please add an access key",
			})
			return
		}
		if (group == "") {
			notification["error"]({
				message: "No Group",
				description: "Please add a group you want to connect to",
			})
			return
		}

		const url = "https://www.workshop-jobs.com"

		const ioConfig = {
			auth: {
				token: key,
			},
			extraHeaders: {
				"agent-type": "machine",
				"group-key": group,
			},
			path: "/socket/",
		}

		const s = io(url, ioConfig)
			.on(MessageProtocols.CONNECT, async () => handleConnect())
			.on(MessageProtocols.ALL_MACHINES, (msg: Message) => {
				console.log("|- MachineAgent: Recieved an all machines message")
			})
			.on(MessageProtocols.DIRECT, (msg: Message) => handleDirectMessage(msg))
			.on(MessageProtocols.MESSAGE_ERROR, (msg: string) => {
				console.log("|- MachineAgent: message error")
				console.log(msg)
			})
			.on(MessageProtocols.CONNECT_ERROR, (err) => handleConnError(s, err))
			.on(MessageProtocols.STATS, (msg: BamStats) => setStats(msg))
		setSocket(s)
	}

	const disconnect = () => {
		if (socket) {
			socket.close()
			setSocket(null)
		}
		setStats({
			activeJobs: 0,
			activeMachines: 0,
		})
	}

	const handleConnect = () => {
		console.log(`|- MachineAgent: connected`)
		setSocketState(MachineSocketStates.CONNECTED)
	}

	const handleDirectMessage = (msg: Message) => {
		console.log("|- MachineAgent: Received a direct message")
		if (msg.subject == MessageSubject.JOB_IS_AVAILABLE) {
			setJobs((jobs) => [...jobs, msg])
		}
		if (msg.subject == MessageSubject.JOB_HAS_ACCEPTED_MACHINES_OFFER) {
			console.log("|- MachineAgent: Passing on the GCode")
			setJobs([])
			props.setGcode(msg.body.gcode)
		}
		if (msg.subject == MessageSubject.JOB_HAS_DECLINED_MACHINES_OFFER) {
			setJobs([])
		}
	}

	const handleConnError = (s: Socket, err: string) => {
		console.log("|- MachineAgent: connection error")
		notification["error"]({
			message: "Connection Error",
			description: "Please check your access key",
		})
		setConnectBtnDisabled(false)
		s.close()
		setSocket(null)
	}

	return (
		<Fragment>
			<Descriptions title="Machine Agent Status">
				<Descriptions.Item label="Socket State">
					<Tag color="blue">{socketState}</Tag>
				</Descriptions.Item>
				<Descriptions.Item label="Socket Id">
					<Tag color="green">{socket?.id}</Tag>
				</Descriptions.Item>
				<Descriptions.Item label="# Active Jobs">
					<Tag color="green">{stats.activeJobs}</Tag>
				</Descriptions.Item>
				<Descriptions.Item label="# Active Machines">
					<Tag color="green">{stats.activeMachines}</Tag>
				</Descriptions.Item>
			</Descriptions>
			<Space>
				<Input
					placeholder="Access Key"
					onChange={(v) => setKey(v.target.value)}
					value={key}
				/>
				<Input
					placeholder="Group"
					onChange={(v) => setGroup(v.target.value)}
					value={group}
				/>
				<Button onClick={connect} disabled={connectBtnDisabled}>
					Connect
				</Button>
				<Button onClick={disconnect} disabled={!connectBtnDisabled}>
					Disconnect
				</Button>
			</Space>
		</Fragment>
	)
}
