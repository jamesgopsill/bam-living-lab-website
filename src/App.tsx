import { PageHeader, Layout, Tabs} from "antd"
import React, { FC } from "react"
import "./App.css"
import { AppFooter } from "./AppFooter"
import { JobAgent } from "./JobAgent"
import { MachineAgent } from "./MachineAgent"

const { Content } = Layout
const { TabPane } = Tabs

export const App: FC = () => {
	return (
		<Layout>
			<PageHeader title="BAM Living Lab" />
			<Content>
				<Tabs defaultActiveKey="1">
					<TabPane tab="Submit a Job" key="1">
						<JobAgent />
					</TabPane>
					<TabPane tab="Connect a Machine" key="2">
						<MachineAgent />
					</TabPane>
				</Tabs>
			</Content>
			<AppFooter />
		</Layout>
	)
}
