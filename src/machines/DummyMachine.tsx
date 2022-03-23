import { Button, Descriptions, Space } from "antd"
import React, { FC, Fragment, useEffect } from "react"
import { MachineProps, MachineStates } from "../interfaces"

export const DummyMachine: FC<MachineProps> = (props) => {
	useEffect(() => {
		console.log("|- Machine has received some gcode")
		if (props.machineState == MachineStates.AVAILABLE && props.gcode) {
			props.setMachineState(MachineStates.PRINTING)
			props.setGcode("")
			// Set a printing time out
			setTimeout(() => {
				props.setMachineState(MachineStates.PRINT_COMPLETE)
			}, 5000)
		}
	}, [props.gcode])

	return (
		<Fragment>
			<Descriptions title="Dummy Machine Status">
				<Descriptions.Item label="Machine State">
					{props.machineState}
				</Descriptions.Item>
			</Descriptions>
			<Space>
				<Button onClick={() => props.setMachineState(MachineStates.AVAILABLE)}>
					Set Machine to Available
				</Button>
				<Button
					onClick={() => props.setMachineState(MachineStates.UNAVAILABLE)}
				>
					Set Machine to Unavailable
				</Button>
				<Button
					onClick={() => props.setMachineState(MachineStates.DISCONNECTED)}
				>
					Disconnect
				</Button>
				<Button onClick={() => props.setMachineState(MachineStates.CONNECTED)}>
					Connect
				</Button>
			</Space>
		</Fragment>
	)
}
