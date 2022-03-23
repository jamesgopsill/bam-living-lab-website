import { Card, Col, Layout, PageHeader, Row, Tabs } from "antd"
import React, { FC } from "react"
import "./App.css"
import { AppFooter } from "./AppFooter"
import { JobAgent } from "./JobAgent"
import { Machine } from "./Machine"

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
					<TabPane tab="Connect an Ultimaker" key="2">
						<Machine type="ultimaker" />
					</TabPane>
					<TabPane tab="Connect an Prusa" key="3">
						<Machine type="prusa" />
					</TabPane>
					<TabPane tab="Development" key="4">
						<Row>
							<Col span={12}>
								<Card>
									<JobAgent />
								</Card>
							</Col>
							<Col span={12}>
								<Card>
									<Machine type="dummy" />
								</Card>
							</Col>
						</Row>
					</TabPane>
				</Tabs>
			</Content>
			<AppFooter />
		</Layout>
	)
}
