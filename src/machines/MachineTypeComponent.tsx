import { Select } from "antd"
import React, { FC } from "react"
import { MachineTypeComponentProps, MachineTypes } from "../interfaces"

const { Option } = Select

export const MachineTypeComponent: FC<MachineTypeComponentProps> = (props) => {
	return (
		<Select
			value={props.machineType}
			onChange={(v) => props.setMachineType(v)}
			style={{ width: 200 }}
		>
			<Option value={MachineTypes.UM3E}>UM3E</Option>
			<Option value={MachineTypes.UMS3}>UMS3</Option>
			<Option value={MachineTypes.PRUSA}>Prusa</Option>
			<Option value={MachineTypes.DUMMY}>Dummy</Option>
			<Option value={MachineTypes.NULL}>Machine Type Not Specified</Option>
		</Select>
	)
}
