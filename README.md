当你的域名托管在腾讯云而解析交给了cloudflare时

该脚本可自动从腾讯云申请免费SSL证书，修改cf解析记录用于验证并下载到证书本地

使用方法为

1.修改get.js配置secretId secretKey  CLOUDFLARE_API_TOKEN ZONE_ID

2.cmd运行npm install

3.cmd运行node get.js
