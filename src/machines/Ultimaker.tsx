import {
	UltimakerClient,
	UltimakerJobDetails,
} from "@jamesgopsill/ultimaker-client"
import {
	Button,
	Descriptions,
	Divider,
	Input,
	notification,
	Space,
	Tag,
} from "antd"
import React, { FC, Fragment, useEffect, useState } from "react"
import { MachineProps, MachineStates } from "../interfaces"
import { useInterval } from "../utils/use-interval"

export const Ultimaker: FC<MachineProps> = (props) => {
	const [ip, setIp] = useState<string>("")
	const [client, setClient] = useState<UltimakerClient | null>(null)
	const [name, setName] = useState<string>("")
	const [printerState, setPrinterState] = useState<string>("")
	const [pingPrinterInterval, setPingPrinterInterval] = useState<number | null>(
		null
	)
	const [currentJob, setCurrentJob] = useState<UltimakerJobDetails | null>(null)

	useEffect(() => {
		console.log("|- Ultimaker: gcode var has updated")
		if (
			props.machineState == MachineStates.AVAILABLE &&
			props.gcode &&
			client
		) {
			notification["success"]({
				message: "Job Accepted",
				description: "Your machine has accepted a job.",
			})
			client.postJob("bam-print", props.gcode).catch((err) => {
				console.log(err)
			})
			props.setMachineState(MachineStates.PRINTING)
			props.setGcode("")
		}
	}, [props.gcode])

	useInterval(() => {
		if (client) {
			client
				.getPrinterStatus()
				.then((res) => {
					setPrinterState(res)
					if (res == "printing") {
						client
							.getJob()
							.then((res) => setCurrentJob(res))
							.catch((err) => console.log("error (no job probably)"))
					}
				})
				.catch((err) => console.log(err))
		}
	}, pingPrinterInterval)

	const connect = () => {
		console.log("|- Ultimaker: connect")
		try {
			const c = new UltimakerClient(ip)
			setClient(c)
			c.getSystemName()
				.then((v) => setName(v))
				.catch((err) => console.log(err))
			setPingPrinterInterval(1000)
		} catch (err) {
			console.log(err)
		}
	}

	const disconnect = () => {
		setClient(null)
		setPingPrinterInterval(null)
		setName("")
		setPrinterState("")
		setCurrentJob(null)
		props.setMachineState(MachineStates.DISCONNECTED)
	}

	const ifClient = () => {
		if (client) return true
		return false
	}

	const makeAvailable = () => {
		console.log("|- Ultimaker made available")
		props.setMachineState(MachineStates.AVAILABLE)
	}

	return (
		<Fragment>
			<Descriptions title="Ultimaker Status">
				<Descriptions.Item label="Machine (Abstract) State">
					<Tag color="blue">{props.machineState}</Tag>
				</Descriptions.Item>
				<Descriptions.Item label="Name">
					<Tag color="blue">{name}</Tag>
				</Descriptions.Item>
				<Descriptions.Item label="Printer State">
					<Tag color="blue">{printerState}</Tag>
				</Descriptions.Item>
			</Descriptions>
			<Space>
				<Input
					placeholder="IP Address"
					value={ip}
					onChange={(v) => setIp(v.target.value)}
				/>
				<Button type="primary" onClick={connect} disabled={ifClient()}>
					Connect
				</Button>
				<Button type="default" onClick={disconnect} disabled={!ifClient()}>
					Disconnect
				</Button>
				<Button type="default" disabled={!ifClient()} onClick={makeAvailable}>
					Set as Available
				</Button>
				<Button
					type="default"
					disabled={!ifClient()}
					onClick={() => props.setMachineState(MachineStates.UNAVAILABLE)}
				>
					Set as Unavailable
				</Button>
			</Space>
			<Divider />
			<Descriptions title="Job Details">
				<Descriptions.Item label="Name">
					<Tag color="green">{currentJob?.name}</Tag>
				</Descriptions.Item>
				<Descriptions.Item label="Started">
					<Tag color="green">{currentJob?.datetime_started}</Tag>
				</Descriptions.Item>
				<Descriptions.Item label="Progress">
					<Tag color="green">{`${currentJob?.progress.toFixed(2)} %`}</Tag>
				</Descriptions.Item>
			</Descriptions>
		</Fragment>
	)
}
