import { Button, Descriptions, Input, notification, Space } from "antd"
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
	const [socketState, setSocketState] = useState<MachineSocketStates>(
		MachineSocketStates.DISCONNECTED
	)
	const [socket, setSocket] = useState<Socket | null>(null)
	const [connectBtnDisabled, setConnectBtnDisabled] = useState<boolean>(false)
	const [key, setKey] = useState<string>("socket-key")
	const [group, setGroup] = useState<string>("test-group")
	const [statsInterval, setStatsInterval] = useState<number | null>(null)
	const [stats, setStats] = useState<BamStats>({
		activeJobs: 0,
		activeMachines: 0,
	})
	const [searchInterval, setSearchInterval] = useState<number | null>(null) // Must be greater than the returns interval

	const searchWait = 4000
	const repliesWait = 2000
	const statsWait = 1000

	const jobs = useRef<Message[]>([])

	useEffect(() => {
		// This should occur when the printer becomes available again for more jobs.
		if (props.machineState == MachineStates.AVAILABLE) {
			setSearchInterval(searchWait)
		}
	}, [props.machineState])

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
		if (jobs.current.length > 0) {
			const job = jobs.current[0]
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
		console.log(`Access Key: ${key} | Group: ${group}`)
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

		setConnectBtnDisabled(true)

		const url = `http://${window.location.hostname}:3000`

		const newSocket = io(url, {
			auth: {
				token: key,
			},
			extraHeaders: {
				"agent-type": "machine",
				"group-key": group,
			},
			path: "/socket/",
		})
			.on(MessageProtocols.CONNECT, async () => {
				console.log(`|- MachineAgent: connected - ${newSocket.id}`)
				setSocketState(MachineSocketStates.CONNECTED)
				setSearchInterval(searchWait)
				setStatsInterval(statsWait)
			})
			.on(MessageProtocols.ALL_MACHINES, (msg: Message) => {
				console.log("|- MachineAgent: Recieved an all machines message")
			})
			.on(MessageProtocols.DIRECT, (msg: Message) => {
				console.log("|- MachineAgent: Recieved a direct message")
				if (msg.subject == MessageSubject.JOB_IS_AVAILABLE) {
					jobs.current.push(msg)
				}
				if (msg.subject == MessageSubject.JOB_HAS_ACCEPTED_MACHINES_OFFER) {
					console.log("|- MachineAgent: Passing on the GCode")
					console.log(msg)
					jobs.current = []
					props.setGcode(msg.body.gcode)
					setSearchInterval(null)
				}
				if (msg.subject == MessageSubject.JOB_HAS_DECLINED_MACHINES_OFFER) {
					jobs.current = []
					setSearchInterval(searchWait)
				}
			})
			.on(MessageProtocols.MESSAGE_ERROR, (msg: string) => {
				console.log(msg)
			})
			.on(MessageProtocols.CONNECT_ERROR, (err) => {
				console.log("|- MachineAgent: connection error")
				notification["error"]({
					message: "Connection Error",
					description: "Please check your access key",
				})
				setConnectBtnDisabled(false)
				newSocket.close()
				setSocket(null)
			})
			.on(MessageProtocols.STATS, (msg: BamStats) => {
				// console.log("|- Machine: Got stats")
				setStats(msg)
			})
		setSocket(newSocket)
	}

	const disconnect = () => {
		if (socket) {
			socket.close()
			setSocket(null)
		}
		setSearchInterval(null)
		setStatsInterval(null)
		setConnectBtnDisabled(false)
	}

	return (
		<Fragment>
			<Descriptions title="Machine Agent Status">
				<Descriptions.Item label="Socket State">
					{socketState}
				</Descriptions.Item>
				<Descriptions.Item label="Socket Id">{socket?.id}</Descriptions.Item>
				<Descriptions.Item label="# Active Jobs">
					{stats.activeJobs}
				</Descriptions.Item>
				<Descriptions.Item label="# Active Machines">
					{stats.activeMachines}
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
