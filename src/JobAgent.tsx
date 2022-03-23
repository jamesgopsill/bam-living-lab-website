import React, { FC, Fragment, useState } from "react"
import { PageHeader, Form, Input, Button, notification, Divider, Select, Upload } from "antd"
import { io } from "socket.io-client"
import { MessageProtocols, Message, MessageSubject, JobAgentStates } from "./interfaces"

const { Option } = Select; 

const wait = (ms: number) => new Promise((r, j) => setTimeout(r, ms))

export const JobAgent: FC = () => {

	const [socketId, setSocketId] = useState<string>("Disconnected")
	const [fileList, setFileList] = useState<any[]>([])

	const beforeUpload = async (file: any) => {
		// Add the file to the file list
		if (file.name.indexOf(".gcode") < 0) {
			notification["error"]({
				"description": "Upload",
				"message": "Invalid File Type"
			})
			setFileList([])
			return Upload.LIST_IGNORE
		}

		//@ts-ignore
		if (file.name.indexOf(".gcode.gz") > -1 && typeof DecompressionStream != "function") {
			notification["error"]({
				"description": "Upload",
				"message": "Google Chrome required for gzip gcode upload"
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

	const onFinish = (form: any) => {
		console.log(form)
		return new Promise(resolve => {
			const jobAgentStatus = JobAgentStates.AVAILABLE
			const url = `http://${window.location.hostname}:3000`
			const socket = io(url, {
				auth: {
					token: form.key,
				},
				extraHeaders: {
					"agent-type": "job"
				},
				path: "/socket/"
			})
			.on("connect", async () => {
				console.log("Connected")
				setSocketId(`Connected: ${socket.id}`)
				// Set a timeout (just to catch anything)
				await wait(form.timeout*1000)
				setSocketId("Disconnected")
				notification["warning"]({
					message: "Timeout",
					description: "Your connection timed out",
				})
				socket.close()
				resolve("")
			})
			.on(MessageProtocols.ALL_JOBS, (msg: Message) => {
				console.log(msg)
				// Respond to the machine
				if (jobAgentStatus == JobAgentStates.AVAILABLE) {
					const response: Message = {
						toId: msg.fromId,
						fromId: socket.id,
						subject: MessageSubject.JOB_AVAILABLE,
						body: {} // TODO: Add relevant details
					}
					socket.emit(MessageProtocols.DIRECT, response)
				}
			})
			.on(MessageProtocols.DIRECT, (msg: any) => {
				console.log(msg)
			})
			.on(MessageProtocols.MESSAGE_ERROR, (msg: string) => {
				console.log(msg)
			})
			.on("connect_error", (err) => {
				console.log("Error")
				socket.close()
				resolve("")
			})
		})
	}

	return (
		<Fragment>
			<PageHeader title="Job Details" extra={socketId} />
			<Form style={{marginLeft: 10, marginRight: 10}} name="basic" onFinish={onFinish}>
				<Form.Item label="Access Key" name="key" initialValue="socket-key">
					<Input placeholder="" />
				</Form.Item>
				<Form.Item label="Connection Timeout (secs)" name="timeout" initialValue={10}>
					<Input type="number" />
				</Form.Item>
				<Divider />
				<Form.Item label="Job Name" name="name">
					<Input placeholder="" />
				</Form.Item>
				<Form.Item label="Material" name="material" initialValue="PLA">
					<Select>
						<Option value="PLA">PLA</Option>
						<Option value="ABS">ABS</Option>
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
					<Button type="primary" htmlType="submit">
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