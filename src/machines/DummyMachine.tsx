import { Button, Descriptions, notification, Space, Tag } from "antd"
import React, { FC, Fragment, useEffect, useState } from "react"
import { MachineProps, MachineStates } from "../interfaces"
import { useInterval } from "../utils/use-interval"
import { MachineTypeComponent } from "./MachineTypeComponent"

export const DummyMachine: FC<MachineProps> = (props) => {
	const [countDown, setCountDown] = useState<number>(0)
	const [countDownInterval, setCountDownInterval] = useState<number | null>(
		null
	)

	useEffect(() => {
		console.log("|- Machine has received some gcode")
		if (props.machineState == MachineStates.AVAILABLE && props.gcode) {
			notification["success"]({
				message: "Job Accepted",
				description: "Your machine has accepted a job.",
			})
			props.setMachineState(MachineStates.PRINTING)
			props.setGcode("")
			setCountDown(10)
			setCountDownInterval(1000)
			// Set a printing time out
			setTimeout(() => {
				notification["success"]({
					message: "Job Complete",
					description: "Your machine has completed the job.",
				})
				props.setMachineState(MachineStates.PRINT_COMPLETE)
				setCountDownInterval(null)
			}, 10000)
		}
	}, [props.gcode])

	useInterval(() => {
		setCountDown((v) => v - 1)
	}, countDownInterval)

	return (
		<Fragment>
			<Descriptions title="Dummy Machine Status">
				<Descriptions.Item label="Machine State">
					<Tag color="blue">{props.machineState}</Tag>
				</Descriptions.Item>
				<Descriptions.Item label="Print Time Remaining (sec)">
					<Tag color="green">{countDown}</Tag>
				</Descriptions.Item>
			</Descriptions>
			<Space>
				<MachineTypeComponent
					machineType={props.machineType}
					setMachineType={props.setMachineType}
				/>
				<Button onClick={() => props.setMachineState(MachineStates.AVAILABLE)}>
					Set Machine to Available
				</Button>
				<Button
					onClick={() => props.setMachineState(MachineStates.UNAVAILABLE)}
				>
					Set Machine to Unavailable
				</Button>
			</Space>
		</Fragment>
	)
}
