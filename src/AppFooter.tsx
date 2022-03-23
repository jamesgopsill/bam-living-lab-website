import { Divider, Layout, Typography } from "antd"
import React, { FC } from "react"

const { Footer } = Layout
const { Text } = Typography

export const AppFooter: FC = () => {
	return (
		<Footer>
			<Divider />
			<Text type="secondary">
				Agent-Based Manufacturing Living Lab - EPSRC Brokering Additive
				Manufacturing Project - Design Manufacturing Futures Lab
			</Text>
		</Footer>
	)
}
