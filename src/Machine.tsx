import { Divider } from "antd"
import React, { FC, Fragment, useState } from "react"
import { MachineStates, MachineTabProps, MachineTypes } from "./interfaces"
import { MachineAgent } from "./MachineAgent"
import { DummyMachine } from "./machines/DummyMachine"
import { Prusa } from "./machines/Prusa"
import { Ultimaker } from "./machines/Ultimaker"

export const Machine: FC<MachineTabProps> = (props) => {
	const [machineState, setMachineState] = useState<MachineStates>(
		MachineStates.DISCONNECTED
	)
	const [gcode, setGcode] = useState<string>("")
	const [machineType, setMachineType] = useState<MachineTypes>(
		MachineTypes.NULL
	)

	const machine = () => {
		if (props.type == "dummy") {
			return (
				<DummyMachine
					machineState={machineState}
					setMachineState={setMachineState}
					gcode={gcode}
					setGcode={setGcode}
					machineType={machineType}
					setMachineType={setMachineType}
				/>
			)
		}
		if (props.type == "ultimaker") {
			return (
				<Ultimaker
					machineState={machineState}
					setMachineState={setMachineState}
					gcode={gcode}
					setGcode={setGcode}
					machineType={machineType}
					setMachineType={setMachineType}
				/>
			)
		}
		if (props.type == "prusa") {
			return (
				<Prusa
					machineState={machineState}
					setMachineState={setMachineState}
					gcode={gcode}
					setGcode={setGcode}
					machineType={machineType}
					setMachineType={setMachineType}
				/>
			)
		}
		return
	}

	return (
		<Fragment>
			{machine()}
			<Divider />
			<MachineAgent
				machineState={machineState}
				gcode={gcode}
				setGcode={setGcode}
				machineType={machineType}
			/>
		</Fragment>
	)
}
