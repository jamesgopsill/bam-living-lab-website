import {
	Button,
	Descriptions,
	Divider,
	Form,
	Input,
	notification,
	Select,
	Upload,
} from "antd"
import React, { FC, Fragment, useRef, useState } from "react"
import { io } from "socket.io-client"
import {
	BamStats,
	JobAgentStates,
	Message,
	MessageProtocols,
	MessageSubject,
} from "./interfaces"

const { Option } = Select

const wait = (ms: number) => new Promise((r, j) => setTimeout(r, ms))

export const JobAgent: FC = () => {
	const [socketStatus, setSocketStatus] = useState<string>("Disconnected")
	const [socketId, setSocketId] = useState<string>("")

	const jobState = useRef<JobAgentStates>(JobAgentStates.NOT_ONLINE)
	const [jobStatus, setJobStatus] = useState<JobAgentStates>(
		JobAgentStates.NOT_ONLINE
	)

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
		jobState.current = JobAgentStates.AVAILABLE
		setJobStatus(JobAgentStates.AVAILABLE)
		const url = `http://${window.location.hostname}:3000`
		const socket = io(url, {
			auth: {
				token: form.key,
			},
			extraHeaders: {
				"agent-type": "job",
				"group-key": form.group,
			},
			path: "/socket/",
		})
			.on(MessageProtocols.CONNECT, async () => {
				console.log(`|- Job connected: ${socket.id}`)
				setSocketStatus("Connected")
				setSocketId(socket.id)
				socket.emit(MessageProtocols.STATS)

				// Set a timeout (just to catch anything)
				await wait(form.timeout * 1000)

				console.log(jobState.current)
				setSocketStatus("Disconnected")
				setSocketId("")
				setDisabled(false)
				if (jobState.current != JobAgentStates.SELECTED) {
					notification["warning"]({
						message: "Timeout",
						description: "Your connection timed out",
					})
					jobState.current = JobAgentStates.NOT_ONLINE
					setJobStatus(JobAgentStates.NOT_ONLINE)
				}
				socket.close()
			})
			.on(MessageProtocols.ALL_JOBS, (msg: Message) => {
				console.log(msg)
				// Respond to the machine
				if (
					msg.subject == MessageSubject.MACHINE_IS_LOOKING_FOR_JOBS &&
					jobState.current == JobAgentStates.AVAILABLE
				) {
					const response: Message = {
						toId: msg.fromId,
						fromId: socket.id,
						subject: MessageSubject.JOB_IS_AVAILABLE,
						body: {},
					}
					socket.emit(MessageProtocols.DIRECT, response)
					return
				}
			})
			.on(MessageProtocols.DIRECT, async (msg: any) => {
				console.log("|- Job received DIRECT message")
				if (
					msg.subject == MessageSubject.MACHINE_HAS_CHOSEN_A_JOB &&
					jobState.current == JobAgentStates.AVAILABLE
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
					jobState.current = JobAgentStates.SELECTED
					setJobStatus(JobAgentStates.SELECTED)
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
			})
			.on(MessageProtocols.MESSAGE_ERROR, (msg: string) => {
				console.log(msg)
			})
			.on(MessageProtocols.CONNECT_ERROR, (err) => {
				console.log("Error")
				setDisabled(false)
				socket.close()
			})
			.on(MessageProtocols.STATS, (msg: BamStats) => {
				console.log("Got stats")
				setStats(msg)
			})
	}

	return (
		<Fragment>
			<Descriptions title="Job Details">
				<Descriptions.Item label="Connection Status">
					{socketStatus}
				</Descriptions.Item>
				<Descriptions.Item label="Socket Id">{socketId}</Descriptions.Item>
				<Descriptions.Item label="Job Status">{jobStatus}</Descriptions.Item>
				<Descriptions.Item label="# Active Jobs">
					{stats.activeJobs}
				</Descriptions.Item>
				<Descriptions.Item label="# Active Machines">
					{stats.activeMachines}
				</Descriptions.Item>
			</Descriptions>
			<Divider />
			<Form
				style={{ marginLeft: 10, marginRight: 10 }}
				name="basic"
				onFinish={onFinish}
			>
				<Form.Item label="Access Key" name="key" initialValue="socket-key">
					<Input placeholder="" />
				</Form.Item>
				<Form.Item label="Group" name="group" initialValue="test-group">
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

/*
// For marketplace mode
// For loop repeating the emit if the agent in is the state searching
for (let i = 0; i < form.timeout; i++) { 
	if (agentState == JobAgentStates.SEARCHING) {
		const msg: Message = {
			toId: "",
			fromId: socket.id,
			subject: MessageSubject.JOB_AVAILABLE,
			body: {}
		}
		socket.emit(MessageProtocols.ALL_MACHINES, msg)
	}
	await wait(1000)
}
*/
