import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class Example implements INodeType {
	description: INodeTypeDescription = {
		displayName: '数据湖仓连接器',
		name: 'example',
		// 建议为您自己的节点创建一个SVG图标
		icon: { light: 'file:example.svg', dark: 'file:example.dark.svg' },
		group: ['input'], // 您可以根据节点功能更改分组，例如 'transform', 'action'
		version: 1,
		description: '连接数据湖仓并根据提示词获取信息',
		defaults: {
			name: '数据湖仓连接器',
		},
		// 此节点将作为起点，因此没有输入
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		properties: [
			// 1. 新增的输入参数
			{
				displayName: 'Host 地址',
				name: 'host',
				type: 'string',
				default: '',
				required: true, // 设置为必填项
				placeholder: '例如: 127.0.0.1 或 aihost.example.com',
				description: '数据湖服务的主机地址',
			},
			{
				displayName: '端口号',
				name: 'port',
				type: 'number',
				default: 8080,
				required: true,
				placeholder: '例如: 8080',
				description: '数据湖服务的端口号',
			},
			{
				displayName: '用户名',
				name: 'username',
				type: 'string',
				default: '',
				description: '用于连接服务的用户名',
			},
			{
				displayName: '密码',
				name: 'password',
				type: 'string',
				// 使用 password 类型可以在UI上隐藏输入内容
				typeOptions: {
					password: true,
				},
				default: '',
				description: '用于连接服务的密码',
			},
			{
				displayName: '系统提示词 (System Prompt)',
				name: 'system_prompt',
				type: 'string',
				// 使用多行输入框
				typeOptions: {
					rows: 4,
				},
				default: '',
				placeholder: '例如: 你是一个数据分析助手...',
				description: '定义AI模型的角色和行为的系统级指令',
			},
			{
				displayName: '用户提示词 (User Prompt)',
				name: 'user_prompt',
				type: 'string',
				typeOptions: {
					rows: 6,
				},
				default: '',
				required: true,
				placeholder: '例如: 请帮我查询上个季度的销售额前十的产品...',
				description: '用户输入的具体问题或指令',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// 因为这个节点是输入节点(inputs: [])，它通常只执行一次
		// 我们保留循环结构以保持灵活性，但对于输入节点，items通常为空
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// 如果作为输入节点，通常只运行一次
		const loopCount = items.length || 1;

		for (let itemIndex = 0; itemIndex < loopCount; itemIndex++) {
			try {
				// 2. 获取所有在 properties 中定义的参数值
				const host = this.getNodeParameter('host', itemIndex, '') as string;
				const port = this.getNodeParameter('port', itemIndex, 0) as number;
				const username = this.getNodeParameter('username', itemIndex, '') as string;
				// const password = this.getNodeParameter('password', itemIndex, '') as string;
				const systemPrompt = this.getNodeParameter('system_prompt', itemIndex, '') as string;
				const userPrompt = this.getNodeParameter('user_prompt', itemIndex, '') as string;

				// --- 在这里开始编写您的核心业务逻辑 ---
				// 1. 构造请求的 URL
				// 注意：根据您的 curl 示例，协议是 http
				const url = `http://${host}:${port}/api/v1/task/goods`;

				// 2. 准备请求体 (Body)
				// 根据您的 curl 命令，请求体包含一个 limit 字段
				const requestBody = {
					limit: 10,
				};

				// 3. 设置请求选项，包括方法、URL、请求头和请求体
				const options: IHttpRequestOptions = {
					method: 'POST',
					url: url,
					headers: {
						'accept': 'application/json',
						'Content-Type': 'application/json',
					},
					body: requestBody,
					// json: true 会自动将 body 序列化为 JSON 字符串，
					// 并将收到的响应自动解析为 JSON 对象
					json: true,
				};

				// 4. 发送 HTTP 请求并等待响应
				// apiResult 将会是服务器返回的已解析的 JSON 对象
				const apiResult = await this.helpers.httpRequest(options);

				const outputJson = {
					status: 'success',
					timestamp: new Date().toISOString(),
					request: {
						host,
						port,
						user: username,
						systemPrompt,
						userPrompt,
					},
					// 您可以在这里填充从服务获取的真实数据
					responseData: apiResult,
				};

				// --- 核心业务逻辑结束 ---

				// 将最终的JSON数据包装后添加到返回数组中
				returnData.push({ json: outputJson });

			} catch (error) {
				if (this.continueOnFail()) {
					// 如果节点配置为失败时继续，则将错误信息附加到输出中
					const errorData = { json: {}, error: error.message };
					if (items.length > 0) {
						errorData.json = this.getInputData(itemIndex)[0].json;
						// errorData.pairedItem = itemIndex;
					}
					items.push(errorData as INodeExecutionData);
				} else {
					if (error.context) {
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		// n8n期望的返回格式是一个包含数据数组的数组
		return [returnData];
	}
}