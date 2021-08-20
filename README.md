# TideWallet-Backend-Parser
Blockchain Parser for TideWallet

## Run Crawler
```
cd /path/to/TideWallet-Backend
npm install
pm2 start . -n TideWallet-Crawler
```

## Run Parser
```
cd /path/to/TideWallet-Backend-Parser
npm install
pm2 start . -i 5 -n TideWallet-Parser
```
