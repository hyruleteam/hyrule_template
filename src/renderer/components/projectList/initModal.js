import React from 'react';
import {
		Modal,
		Form,
		Input,
		Button,
		Radio,
		Spin,
		message
} from 'antd';

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {showInitModal,showInitInfo,showInitModalConfirm} from '../../actions/projectList';
import styles from './index.less';

const FormItem = Form.Item;
const RadioGroup = Radio.Group;
const { TextArea } = Input;
const {remote,ipcRenderer} = window.require('electron');
const {initProject} = remote.getGlobal('services');

const failedStatus = {loading:false,okText:'开始'}
let lineInfo = "";

const formItemLayout = {
		labelCol: {
				span: 6
		},
		wrapperCol: {
				span: 16
		}
};

const handleOk = (props) => {
		lineInfo = "";
		props
				.form
				.validateFields(async (err, values) => {
						if (!err) {
							props.showInitModalConfirm({loading:true,okText:'初始化中'})
							await doInitProject(props.data,props);
						}
				});
}

const handleCancel = (props) => {
		props.showInitModal(false);
		props.showInitModalConfirm(failedStatus)
		props.showInitInfo("")
}

const showLine = (info,props,type) => {
	let txt = ""
	if(type === 'error'){
		txt = `<p style="color:#f5222d">${info}</p>`
	}else if(type === 'success'){
		txt = `<p style="color:#52c41a">${info}</p>`
	}else{
		txt = `<p>${info}</p>`
	}
	lineInfo += txt;
	props.showInitInfo(lineInfo)
}

const doInitProject = async (data,props) => {
	//判断是否是空文件夹
	try{
		const res = await initProject.checkDirExists(data)
	}catch(e){
		showLine('文件夹已经存在，请删除文件夹',props,'error')
		props.showInitModalConfirm(failedStatus)
		return;
	}

	if(data.templateData.type === 'git'){
		//clone git模版
		showLine('====开始clone git模版====',props)
		try {
			showLine('正在clone git模版',props)
			const gitRes = await initProject.generateByGit(data)
			showLine('clone git模版成功',props,'success')
		} catch (e) {
			showLine('clone git模版失败！请检查git是否配置正确',props,'error')
				props.showInitModalConfirm(failedStatus)
			showLine(e.msg,props,'error')
			return;
		}

		//清除模版信息
		showLine('====开始清除模版信息====',props)
		try {
			showLine('正在清除模版信息',props)
			const gitRes = await initProject.cleanGitFile(data)
			showLine('清除模版信息成功',props,'success')
		} catch (e) {
			props.showInitModalConfirm(failedStatus)
			showLine('清除模版信息失败',props,'error')
			showLine(e.msg,props,'error')
		}

		//生成项目信息
		showLine('====开始生成项目信息====',props)
		try {
			showLine('正在生成项目信息',props)
			const gitRes = await initProject.generatePackageJson(data)
			showLine('生成项目信息成功',props,'success')
		} catch (e) {
			props.showInitModalConfirm(failedStatus)
			showLine(e.msg,props,'error')
		}

		//根据选择触发安装模式
		showLine('====开始安装依赖====',props)
		try {
			showLine('正在安装依赖，时间较长，请耐心等待',props)
			const gitRes = await initProject.runNpm(data)
			showLine(gitRes.msg,props,'success')
			showLine('安装依赖成功',props,'success')
		} catch (e) {
			showLine(e.msg,props,'error')
		}

		props.showInitModalConfirm({loading:false,okText:'初始化完成'})

	}else if(data.templateData.type === 'local'){
		try {
			const localRes = await initProject.generateByLocal(data)
		} catch (e) {
			message.error(e);
		}
	}
}

const InitModel = Form.create()((props) => {
		const {visible, form} = props;
		const {getFieldDecorator} = form;
		return (
				<div>
						<Modal
								title="初始化项目"
								okText={props.status?props.status.okText:'开始'}
								cancelText="取消"
								visible={visible}
								confirmLoading={props.status?props.status.loading:false}
								onOk={() => {
								handleOk(props)
						}}
								onCancel={() => {
								handleCancel(props)
						}}>
								<Form layout="horizontal">
										<FormItem label="请选择安装方式" {...formItemLayout}>
												{getFieldDecorator('installWays',{
													initialValue:'1'
												})(
													<RadioGroup name="installWays">
														<Radio value='1'>npm</Radio>
														<Radio value='2'>yarn</Radio>
													</RadioGroup>
												)}
										</FormItem>
										<FormItem>
												{/* {getFieldDecorator('lineinfo')(<TextArea rows={12}/>)} */}
												<div className={styles['init-info']} dangerouslySetInnerHTML={{__html:props.info}}></div>
										</FormItem>
								</Form>
						</Modal>
				</div>
		);
})

const mapStateToProps = store => {
		return {
			initVisible: store.projectList.initVisible, 
			data: store.projectList.data,
			info:store.projectList.info,
			status:store.projectList.status,
		};
};

const mapDispatchToProps = dispatch => {
		return {
			showInitModal: bindActionCreators(showInitModal, dispatch),
			showInitModalConfirm:bindActionCreators(showInitModalConfirm, dispatch),
			showInitInfo:bindActionCreators(showInitInfo, dispatch),
		};
};

export default connect(mapStateToProps, mapDispatchToProps)(InitModel);