
////// / <reference path = "./ctyHelper.ts" />
import Axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ErrorCode } from './Const';
// import { isCrypto, apiUrl } from '../config/SystemConfig';
import { isCrypto } from '../config/SystemConfig';
import { CryptoData } from './ctyHelper';
import {SystemStore} from '../store/SystemStore'
// import utils from '../utils/utils'
import md5 = require('md5');
// const codeMessage: any = {
//     200: '服务器成功返回请求的数据。',
//     201: '新建或修改数据成功。',
//     202: '一个请求已经进入后台排队（异步任务）。',
//     204: '删除数据成功。',
//     400: '发出的请求有错误，服务器没有进行新建或修改数据的操作。',
//     401: '用户没有权限（令牌、用户名、密码错误）。',
//     403: '用户得到授权，但是访问是被禁止的。',
//     404: '发出的请求针对的是不存在的记录，服务器没有进行操作。',
//     406: '请求的格式不可得。',
//     410: '请求的资源被永久删除，且不会再得到的。',
//     422: '当创建一个对象时，发生一个验证错误。',
//     500: '服务器发生错误，请检查服务器。',
//     502: '网关错误。',
//     503: '服务不可用，服务器暂时过载或维护。',
//     504: '网关超时。',
// };
export default class _Net {

    private static instance: _Net;

    private axios: AxiosInstance;

    private ctyHelper: CryptoData.CtyHelper;

    private constructor(_ctyHelper: CryptoData.CtyHelper) {
        const IS_DEV = process.env.NODE_ENV === 'development';

        this.ctyHelper = _ctyHelper;
      

        let config = {
            baseURL: IS_DEV ? '' :SystemStore.apiUrl,
            // baseURL: IS_DEV ? '' : (utils.apiJudge(apiUrl)? 'http://api.'+apiUrl:'http://'+apiUrl),
            headers: {
                'Access-Control-Allow-Origin': '*',
                // 'version-Secret':isCrypto?"1.0":'0.0',
                // 'version-pc':isCrypto?md5('0.13.3'):'',
                // 'Connection':'close'
                // 'Content-Type':'application/json;charset=UTF-8',
                // "Access-Control-Allow-Credentials":true
            },
            // withCredentials: true
        };

        if (isCrypto) {
            config.headers['version-Secret'] = "1.0";
            config.headers['version-pc'] = md5('0.13.3');
        }
        this.axios = Axios.create(config);
        this.axios.defaults.timeout = 30000;           //超时时间
        this.axios.defaults['retry'] = 3;                 //请求次数
        this.axios.defaults['retryDelay'] = 1000;         //请求间隙
        // console.log('IS_DEV->',IS_DEV, SystemStore.apiUrl,this.axios,config);
        this.init();

    }

    public init = () => {
        this.axios.interceptors.response.use(undefined, (err) => {
            let config = err.config

            console.log('我错了！！！！！！');
            // 判断是否配置了重试
            if (!config || !config.retry) return Promise.reject(err)
            if (!config.shouldRetry || typeof config.shouldRetry !== 'function') return Promise.reject(err)

            // 判断是否满足重试条件
            if (!config.shouldRetry(err)) return Promise.reject(err)

            // 设置重试次数
            config.__retryCount = config.__retryCount || 0
            if (config.__retryCount >= config.retry) return Promise.reject(err)

            // 重试次数自增
            config.__retryCount += 1

            // 延时处理
            let backoff = new Promise((resolve) => {
                let timer = setTimeout(() => {
                    clearTimeout(timer);
                    resolve();
                }, config.retryDelay || 1)
            })
            // config.data = Qs.parse(config.data)
            // 重新发起axios请求
            return backoff.then(() => {
                return this.axios(config)
            })
        })
    }
    public static getInstance(_prk: string, _puk: string, _apikey: string, _appk: string): _Net {
        let _ctyHelper = new CryptoData.CtyHelper(_prk, _puk, _apikey, _appk);
        // this.instance = this.instance || new _Net(_ctyHelper);
        this.instance = new _Net(_ctyHelper);
        return this.instance
    }

    private static getParams(data: any): URLSearchParams {
        let params = new URLSearchParams();
        for (let [key, value] of Object["entries"](data)) {
            params.append(key, value as any)
        }
        return params;
    }


    public request(config: AxiosRequestConfig): Promise<any> {
        return new Promise((resolve, rejects) => {
            this.axios.request(config).then(response => {
                resolve(response)
            }).catch(error => {
                rejects(error);
            })
        })
    }

    public postRequest(url: string, data?: any, config?: AxiosRequestConfig | undefined): Promise<any> {
        let ctd = isCrypto ? this.ctyHelper.getCryptoMd5(data || { time: new Date().getTime() }) : data;

        // console.log('发送的数据 ---', ctd, '---参数----', config);

        return new Promise((resolve, rejects) => {
            try{
                this.axios.post(url, _Net.getParams(ctd), config ? Object.assign(config, {
                    headers: {
                        // 'Access-Control-Allow-Origin': '*',
                        "Content-Type": "application/x-www-form-urlencoded",
                        // "Access-Control-Allow-Credentials":true
                        'version-Secret': isCrypto ? "1.0" : '0.0'
                    }
                }) : config).then(response => {
                    resolve(response.data);
                }).catch(error => {
                    rejects(error);
                })
            }catch(e){
                console.error('postRequest',e)
                resolve(null)
            }
        })
    }

    public getRequest(url: string, config?: AxiosRequestConfig | undefined): Promise<any> {
        return new Promise((resolve, rejects) => {
            this.axios.get(url, config).then(response => {
                if (response.status == 200) {
                    this.handleResponse(response);
                }
                resolve(response.data)
            }).catch(error => {
                rejects(error);
            })
        })
    }

    private handleResponse(response: any): void {
        if (response.status == 200) {
            let result = response.data;
            if (ErrorCode.LACK_TOKENS == result.resultCode) {

            } else if (ErrorCode.EXPIRE_TOKENS == result.resultCode) {

            } else if (ErrorCode.COMMON_ERROR == result.resultCode) {

            }
        }
    }
}