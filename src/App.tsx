import { Card, Col, Layout, PageHeader, Row, Tabs } from "antd"
import React, { FC } from "react"
import "./App.css"
import { AppFooter } from "./AppFooter"
import { JobAgent } from "./JobAgent"
import { Machine } from "./Machine"

const { Content } = Layout
const { TabPane } = Tabs

/*
{
	<iframe
	src="https://github.com/sponsors/jamesgopsill/button"
	title="Sponsor jamesgopsill"
	height="35"
	width="116"
	style={{ border: 0 }}
></iframe>
}
*/

export const App: FC = () => {
	return (
		<Layout>
			<PageHeader title="BAM Living Lab" extra="" />
			<Content>
				<Tabs defaultActiveKey="1">
					<TabPane tab="Submit a Job" key="1">
						<JobAgent />
					</TabPane>
					<TabPane tab="Connect an Ultimaker" key="2">
						<Machine type="ultimaker" />
					</TabPane>
					<TabPane tab="Connect a Prusa" key="3">
						<Machine type="prusa" />
					</TabPane>
					<TabPane tab="Development" key="4">
						<Row>
							<Col span={12}>
								<Card style={{ margin: 5 }}>
									<Machine type="dummy" />
								</Card>
							</Col>
							<Col span={12}>
								<Card style={{ margin: 5 }}>
									<JobAgent />
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
