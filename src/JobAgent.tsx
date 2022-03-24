import {
	Button,
	Descriptions,
	Divider,
	Form,
	Input,
	notification,
	Select,
	Tag,
	Upload,
} from "antd"
import React, { FC, Fragment, useRef, useState } from "react"
import { io, Socket } from "socket.io-client"
import {
	BamStats,
	JobAgentStates,
	JobSocketStates,
	Message,
	MessageProtocols,
	MessageSubject,
} from "./interfaces"

const { Option } = Select

const wait = (ms: number) => new Promise((r, j) => setTimeout(r, ms))

export const JobAgent: FC = () => {
	const [socketState, setSocketState] = useState<JobSocketStates>(
		JobSocketStates.DISCONNECTED
	)
	const [socketId, setSocketId] = useState<string>("")

	const [jobState, setJobState] = useState<JobAgentStates>(
		JobAgentStates.NOT_ONLINE
	)
	const jobStateRef = useRef(jobState)
	jobStateRef.current = jobState

	const [fileList, setFileList] = useState<any[]>([])
	const [disabled, setDisabled] = useState<boolean>(false)
	const [stats, setStats] = useState<BamStats>({
		activeJobs: 0,
		activeMachines: 0,
	})

	const beforeUpload = async (file: any) => {
		// Add the file to the file list
		if (file.name.indexOf(".gcode") < 0) {
			notification["error"]({
				description: "Upload",
				message: "Invalid File Type",
			})
			setFileList([])
			return Upload.LIST_IGNORE
		}

		//@ts-ignore
		if (
			file.name.indexOf(".gcode.gz") > -1 &&
			typeof DecompressionStream != "function"
		) {
			notification["error"]({
				description: "Upload",
				message: "Google Chrome required for gzip gcode upload",
			})
			setFileList([])
			return Upload.LIST_IGNORE
		}

		setFileList([file])
		return false // Return false we went to handle the file upload manually
	}

	const onRemove = (file: any) => {
		setFileList((fL) => {
			const index = fL.indexOf(file)
			const nFL = fL.slice()
			nFL.splice(index, 1)
			return nFL
		})
	}

	const onFinish = (form: any): void => {
		// console.log(form)
		if (!form.name || form.name == "") {
			notification["error"]({
				message: "Incomplete Form",
				description: "Please add a name for your job.",
			})
			return
		}
		if (!form.group || form.group == "") {
			notification["error"]({
				message: "Incomplete Form",
				description: "Please add a the group you wish the job to join.",
			})
			return
		}
		if (fileList.length != 1) {
			notification["error"]({
				message: "Incomplete Form",
				description: "Please add your gcode",
			})
			return
		}
		setDisabled(true)
		createJobAgent(form)
	}

	const createJobAgent = (form: any): void => {
		setJobState(JobAgentStates.AVAILABLE)

		const url = "https://www.workshop-jobs.com"

		const ioConfig = {
			auth: {
				token: form.key,
			},
			extraHeaders: {
				"agent-type": "job",
				"group-key": form.group,
			},
			path: "/socket/",
		}
		const socket = io(url, ioConfig)
			.on(MessageProtocols.CONNECT, () => handleConnect(socket, form.timeout))
			.on(MessageProtocols.ALL_JOBS, (msg: Message) =>
				handleAllJobs(socket, msg)
			)
			.on(MessageProtocols.DIRECT, async (msg: any) =>
				handleDirect(socket, msg)
			)
			.on(MessageProtocols.MESSAGE_ERROR, (msg: string) => console.log(msg))
			.on(MessageProtocols.CONNECT_ERROR, (err: string) =>
				handleConnError(socket, err)
			)
			.on(MessageProtocols.STATS, (msg: BamStats) => setStats(msg))
	}

	const handleConnect = async (
		socket: Socket,
		timeout: number
	): Promise<void> => {
		console.log(`|- Job connected: ${socket.id}`)
		setSocketState(JobSocketStates.CONNECTED)
		setSocketId(socket.id)
		socket.emit(MessageProtocols.STATS)

		// Set a timeout (just to catch anything)
		await wait(timeout * 1000)

		console.log(`|- JobAgent: Reached timout with state ${jobStateRef.current}`)
		setSocketState(JobSocketStates.DISCONNECTED)
		setSocketId("")
		setDisabled(false)
		if (jobStateRef.current != JobAgentStates.SELECTED) {
			notification["warning"]({
				message: "Timeout",
				description: "Your connection timed out",
			})
			setJobState(JobAgentStates.NOT_ONLINE)
		}
		socket.close()
	}

	const handleAllJobs = (socket: Socket, msg: Message): void => {
		console.log("|- JobAgent: received ALL_JOBS message")
		console.log(`|- JobAgent: status - ${jobStateRef.current}`)
		// Respond to the machine
		if (
			msg.subject == MessageSubject.MACHINE_IS_LOOKING_FOR_JOBS &&
			jobStateRef.current == JobAgentStates.AVAILABLE
		) {
			const response: Message = {
				toId: msg.fromId,
				fromId: socket.id,
				subject: MessageSubject.JOB_IS_AVAILABLE,
				body: {},
			}
			socket.emit(MessageProtocols.DIRECT, response)
		}
	}

	const handleDirect = async (socket: Socket, msg: Message): Promise<void> => {
		console.log("|- Job received DIRECT message")
		if (
			msg.subject == MessageSubject.MACHINE_HAS_CHOSEN_A_JOB &&
			jobStateRef.current == JobAgentStates.AVAILABLE
		) {
			console.log("|- Job responding with accept")
			const response: Message = {
				toId: msg.fromId,
				fromId: socket.id,
				subject: MessageSubject.JOB_HAS_ACCEPTED_MACHINES_OFFER,
				body: {
					gcode: await fileList[0].text(),
				},
			}
			socket.emit(MessageProtocols.DIRECT, response)
			setJobState(JobAgentStates.SELECTED)
			notification["success"]({
				message: "Job Accepted",
				description: "A machine has accepted your job",
			})
			return
		}
		if (msg.subject == MessageSubject.MACHINE_HAS_CHOSEN_A_JOB) {
			console.log("|- Job responding with decline")
			const response: Message = {
				toId: msg.fromId,
				fromId: socket.id,
				subject: MessageSubject.JOB_HAS_DECLINED_MACHINES_OFFER,
				body: {},
			}
			socket.emit(MessageProtocols.DIRECT, response)
			return
		}
	}

	const handleConnError = (socket: Socket, err: string): void => {
		console.log(`Connection Error: ${err}`)
		setDisabled(false)
		socket.close()
	}

	return (
		<Fragment>
			<Descriptions title="Job Details">
				<Descriptions.Item label="Connection Status">
					<Tag color="blue">{socketState}</Tag>
				</Descriptions.Item>
				<Descriptions.Item label="Socket Id">
					<Tag color="red">{socketId}</Tag>
				</Descriptions.Item>
				<Descriptions.Item label="Job Status">
					<Tag color="blue">{jobState}</Tag>
				</Descriptions.Item>
				<Descriptions.Item label="# Active Jobs">
					<Tag color="green">{stats.activeJobs}</Tag>
				</Descriptions.Item>
				<Descriptions.Item label="# Active Machines">
					<Tag color="green">{stats.activeMachines}</Tag>
				</Descriptions.Item>
			</Descriptions>
			<Divider />
			<Form
				style={{ marginLeft: 10, marginRight: 10 }}
				name="basic"
				onFinish={onFinish}
			>
				<Form.Item label="Access Key" name="key" initialValue="">
					<Input placeholder="" />
				</Form.Item>
				<Form.Item label="Group" name="group" initialValue="">
					<Input placeholder="" />
				</Form.Item>
				<Form.Item
					label="Connection Timeout (secs)"
					name="timeout"
					initialValue={10}
				>
					<Input type="number" />
				</Form.Item>
				<Divider />
				<Form.Item label="Job Name" name="name">
					<Input placeholder="" />
				</Form.Item>
				<Form.Item label="Material" name="material" initialValue="PLA">
					<Select>
						<Option value="PLA">PLA</Option>
					</Select>
				</Form.Item>
				<Form.Item label="GCode">
					<Upload
						beforeUpload={beforeUpload}
						onRemove={onRemove}
						fileList={fileList}
					>
						<Button>Add</Button>
					</Upload>
				</Form.Item>
				<Form.Item>
					<Button type="primary" htmlType="submit" disabled={disabled}>
						Submit
					</Button>
				</Form.Item>
			</Form>
		</Fragment>
	)
}
