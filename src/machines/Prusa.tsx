import { Button, Descriptions, Input, notification, Space, Tag } from "antd"
import React, { FC, Fragment, useEffect, useRef, useState } from "react"
import { MachineProps, MachineStates } from "../interfaces"

export const Prusa: FC<MachineProps> = (props) => {
	const [baudRate, setBaudRate] = useState<number>(115200)
	const [firmware, setFirmware] = useState<string>("")
	const [uuid, setUUID] = useState<string>("")
	const [connection, setConnection] = useState<string>("disconnected")

	const [cancelPrintFlag, setCancelPrintFlag] = useState<boolean>(false)
	const cancelPrintFlagRef = useRef(cancelPrintFlag)
	cancelPrintFlagRef.current = cancelPrintFlag

	const ok = useRef<boolean>(true)

	// Creating refs so I can disconnect the streams at some point
	const writerRef = useRef<WritableStreamDefaultWriter | null>(null)
	const portRef = useRef<any>(null)
	const readerRef = useRef<ReadableStreamDefaultReader | null>(null)

	useEffect(() => {
		console.log("|- Ultimaker: gcode var has updated")
		if (props.machineState == MachineStates.AVAILABLE && props.gcode) {
			notification["success"]({
				message: "Job Accepted",
				description: "Your machine has accepted a job.",
			})
			print(props.gcode)
			props.setMachineState(MachineStates.PRINTING)
		}
	}, [props.gcode])

	const connect = async () => {
		if (!("serial" in navigator)) {
			notification["error"]({
				description: "WebSerial Support",
				message: "This browser does not support Web Serial",
			})
			return
		}

		// Request the serial port
		//@ts-ignore
		const port = await navigator.serial
			.requestPort()
			.catch((err: any) => console.log(err))

		await port.open({ baudRate: baudRate })

		// Run read loop
		readLoop(port)

		// Configure the write stream
		const textEncoder = new TextEncoderStream()
		const writableStreamClosed = textEncoder.readable.pipeTo(port.writable)
		const w = textEncoder.writable.getWriter()
		writerRef.current = w

		// Get firmware details
		await w.write("M115\n")

		portRef.current = port
	}

	const readLoop = async (port: any) => {
		const decoder = new TextDecoderStream()

		port.readable.pipeTo(decoder.writable)

		const inputStream = decoder.readable
		const reader = inputStream.getReader()
		readerRef.current = reader

		notification["success"]({
			description: "Your printer is now connected. Let's see what it's up to.",
			message: "Printer Connected",
		})

		let log: string[] = ["", ""]
		while (true) {
			//console.log("Reading the Serial Port")
			const { value, done } = await reader.read()
			if (value) {
				//console.log(value)
				//console.log("\n".indexOf(value))
				const lines = value.split("\n") // split on new line
				let linesAdded = 0
				//@ts-ignore
				log[log.length - 1] += lines.shift() // take the first and append it to the last partial line
				// add the additional elements (in case there are multiple newlines)
				for (const line of lines) {
					linesAdded += 1
					log.push(line)
				}
				// handle recent log entry event (note that -1 could be a partially digested command)
				// there could also be multiple lines in one message
				for (let i = log.length - (linesAdded + 1); i < log.length - 1; i++) {
					handleResponse(log[i])
				}
			} else {
				// no returns in the response so append to last index in log
				console.log("No carriage return in value")
				log[log.length - 1] += value
			}

			// Removing old elements over time.
			if (log.length > 100) {
				//console.log("Compressing Log From:", log.length)
				log.splice(0, log.length - 100)
				//console.log("Compressing Log To:", log.length)
			}

			if (done) {
				console.log("[READING DONE]")
				reader.releaseLock()
				break
			}
		}
	}

	const handleResponse = (line: string) => {
		line = line.trim()
		line = line.replace("\r", "")
		console.log("Response:", line)

		if (line.includes("ok")) {
			// OK to process another piece of gcode
			ok.current = true
		}
		if (line.startsWith("FIRMWARE_NAME")) {
			let elements = line.split(" SOURCE_CODE_URL")
			setFirmware(elements[0].replace("FIRMWARE_NAME:", ""))
			elements = line.split("UUID:")
			setUUID(elements[1])
		}
	}

	const wait = (ms: number) => new Promise((r, j) => setTimeout(r, ms))

	const print = async (gcode: string) => {
		notification["success"]({
			description: "Whooop!",
			message: "Starting Print",
		})

		// pause requesting for updates
		setCancelPrintFlag(false)
		props.setMachineState(MachineStates.PRINTING)

		console.log("Starting Test Print")

		let gcodeLines = gcode.split("\n")
		for (const line of gcodeLines) {
			if (line == ";End of Gcode") {
				break
			}
			if (cancelPrintFlagRef.current) break // exit loop
			if (!line.startsWith(";")) {
				// Ignore the comments
				while (true) {
					if (cancelPrintFlagRef.current) break // exit loop
					// If ok to send then send the command
					if (ok.current) {
						console.log("Sending:", line)
						writerRef.current?.write(line + "\n")
						ok.current = false
						break // breaks the while loop
					}
					await wait(10) // wait 10ms and hope the printer comes back with an ok
				}
			}
		}

		props.setGcode("")

		if (cancelPrintFlagRef.current) {
			console.log("CANCELLING THE PRINT")
			props.setMachineState(MachineStates.UNAVAILABLE)
			notification["warning"]({
				description: "",
				message: "Print Canceled",
			})
			// Spam the printer until it listens and interrupts whatever the machine is doing
			const resetLines = [
				"M108 ; interrupts the printer to listen for gcode",
				"G91 ; use relative positioning",
				"M104 S0 ; Turn off extruder heater",
				"M140 S0 ; Turn off bed heater",
				"G1 X0 Y0 Z10 F1000 ; park print head",
				"M107 ; Turn off fan",
				"M84 ; disable motors",
			]
			ok.current = true
			for (const line of resetLines) {
				while (true) {
					if (ok.current) {
						console.log("Canceling:", line)
						writerRef.current?.write(line + "\n")
						ok.current = false
						break
					}
					await wait(10)
				}
			}
			setCancelPrintFlag(false)
			return
		}

		notification["success"]({
			description: "Nice one!",
			message: "Printing Finished",
		})

		console.log("Serial Print Complete")
	}

	/*
	const disconnect = () => {
		props.setMachineState(MachineStates.UNAVAILABLE)
		//writerRef.current.cancel()
		readerRef.current.cancel()

		readerRef.current = null
		writerRef.current = null

		portRef.current.close()
		portRef.current = null
	}*/

	const isCanceling = () => {
		if (cancelPrintFlag) {
			return <Tag color="red">canceling print</Tag>
		}
		return <Tag color="green">ready to print</Tag>
	}

	return (
		<Fragment>
			<Descriptions title="Prusa Status">
				<Descriptions.Item label="Machine (Abstract) State">
					<Tag color="blue">{props.machineState}</Tag>
				</Descriptions.Item>
				<Descriptions.Item label="Firmware">
					<Tag color="blue">{firmware}</Tag>
				</Descriptions.Item>
				<Descriptions.Item label="Connection">
					<Tag color="blue">{connection}</Tag>
				</Descriptions.Item>
				<Descriptions.Item label="Cancel Print Flag">
					{isCanceling()}
				</Descriptions.Item>
			</Descriptions>
			<Space>
				<Input
					placeholder="Baud Rate"
					value={baudRate}
					onChange={(v: any) => setBaudRate(v.target.value)}
				/>
				<Button type="primary" onClick={connect}>
					Connect
				</Button>
				{/*
				<Button type="primary" onClick={disconnect}>
					Disconnect
				</Button>
				*/}
				<Button type="primary" onClick={() => setCancelPrintFlag(true)}>
					Cancel Job
				</Button>
				<Button
					type="default"
					onClick={() => props.setMachineState(MachineStates.AVAILABLE)}
				>
					Set as Available
				</Button>
				<Button
					type="default"
					onClick={() => props.setMachineState(MachineStates.UNAVAILABLE)}
				>
					Set as Unavailable
				</Button>
			</Space>
		</Fragment>
	)
}
