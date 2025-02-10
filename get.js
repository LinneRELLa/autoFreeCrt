// Depends on tencentcloud-sdk-nodejs version 4.0.3 or higher

const tencentcloud = require("tencentcloud-sdk-nodejs-ssl");

const fs = require('fs');
const http = require('http');
const axios = require('axios');



const SslClient = tencentcloud.ssl.v20191205.Client;

// 实例化一个认证对象，入参需要传入腾讯云账户 SecretId 和 SecretKey，此处还需注意密钥对的保密
// 代码泄露可能会导致 SecretId 和 SecretKey 泄露，并威胁账号下所有资源的安全性。以下代码示例仅供参考，建议采用更安全的方式来使用密钥，请参见：https://cloud.tencent.com/document/product/1278/85305
// 密钥可前往官网控制台 https://console.cloud.tencent.com/cam/capi 进行获取
const clientConfig = {
    credential: {
        secretId: undefined,
        secretKey: undefined,
    },
    region: "",
    profile: {
        httpProfile: {
            endpoint: "ssl.tencentcloudapi.com",
        },
    },
};

// 实例化要请求产品的client对象,clientProfile是可选的
const client = new SslClient(clientConfig);
const params = {
    "DomainName": "www.rellal.com",
    "DvAuthMethod": 'DNS',
};

(async function() {
    const CertificateId = await new Promise(resolve => {
        client.ApplyCertificate(params).then(
            (data) => {
                resolve(data.CertificateId)
            },
            (err) => {
                console.error("error", err);
            }
        );
    })


    let params1 = {
        "CertificateId": CertificateId
    };
    const CertificateVlue = await new Promise(resolve => {
        client.DescribeCertificateDetail(params1).then(
            (data) => {
                resolve(data.DvAuthDetail)
            },
            (err) => {
                console.error("error", err);
            }
        );

    })

    console.log('添加记录', CertificateVlue)
    await addDNS(CertificateVlue.DvAuthValue);

    console.log(await new Promise(resolve => {
        client.CheckCertificateDomainVerification(params1).then(
            (data) => {
                resolve('主动验证2')
            },
            (err) => {
                console.error("error", err);
            }
        );


    }))


    console.log(await new Promise(resolve => {
        client.CompleteCertificate(params1).then(
            (data) => {
                resolve('主动验证')
            },
            (err) => {
                console.error("error", err);
            }
        );


    }))


    console.log(await new Promise(resolve => {
        setTimeout(() => { resolve('等待15秒'); }, 15000)
    }))


    // 封装一个异步函数，不断尝试获取下载地址
    async function fetchDownloadUrl(params) {
        while (true) {
            try {
                // 尝试请求下载地址
                const data = await client.DescribeDownloadCertificateUrl({ ServiceType: 'apache', ...params });
                return data;
            } catch (err) {
                console.error("DescribeDownloadCertificateUrl 调用失败，3秒后重试：", err);
                // 等待3秒后重试
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
    }

    // 主流程
    (async function main() {
        // 获取下载地址（直到成功为止）
        const downloadUrl = await fetchDownloadUrl(params1);
        console.log(downloadUrl, '下载地址');

        // 使用 axios 进行文件下载
        try {
            const response = await axios({
                method: 'get',
                url: downloadUrl.DownloadCertificateUrl,
                responseType: 'stream' // 设置响应类型为流
            });
            // 注意：这里需要指定具体的文件名（如'./downloaded_file'），否则写入目录会失败
            response.data.pipe(fs.createWriteStream('./crt.zip'));
        } catch (error) {
            console.error("axios 请求下载失败：", error);
        }
    })();


    // console.log(CertificateVlue);


})()


function addDNS(value) {
    return new Promise(resolve => {


        // Cloudflare API 配置
        const CLOUDFLARE_API_TOKEN = undefined; // 替换为你的 API 令牌
        const ZONE_ID = undefined; // 替换为你的 Zone ID

        // TXT 记录参数
        const recordData = {
            type: 'TXT',
            name: '_dnsauth', // 记录名称，如 "_acme-challenge.example.com"
            content: value, // TXT 记录内容
            ttl: 3600, // TTL（单位：秒，1=自动，默认 3600）
            comment: 'ACME verification', // 可选注释
            proxied: false // 必须为 false（TXT 记录不能代理）
        };

        // 发送请求
        const addTXTRecord = async () => {
            try {
                const response = await axios.post(
                    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records`,
                    recordData, {
                        headers: {
                            'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                console.log('记录添加成功:', response.data.result);
                resolve(response.data.result)
            } catch (error) {
                console.error('请求失败:', error.response?.data || error.message);
            }
        };

        addTXTRecord();
    })


}